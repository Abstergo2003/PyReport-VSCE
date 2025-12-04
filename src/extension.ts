import * as vscode from 'vscode';
import * as path from 'path';

import { extractExpressions, detectMatrixes, substituteValues, findTableCommands, createFinalReport } from './helper';

export function activate(context: vscode.ExtensionContext) {
    console.log('PyReport (Integrated Logic) is active!');

    const disposable = vscode.commands.registerCommand('pyreport.getVariables', async () => {
        const editor = vscode.window.activeNotebookEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active notebook.');
            return;
        }

        const notebook = editor.notebook;
        const lastCellIndex = notebook.cellCount;

        // ---------------------------------------------------------
        // 1. FORCIBLY RUN ALL CELLS FIRST
        // ---------------------------------------------------------
        vscode.window.showInformationMessage('Running all cells to ensure data integrity...');
        await vscode.commands.executeCommand('notebook.execute');

        // 2. Python Code (Extract variables safely)
        const pythonCode = `
import json
import sys
import types

def _pyreport_extract_variables():
    ignore_set = {
        'In', 'Out', 'get_ipython', 'exit', 'quit', 'open', 'json', 'sys', 'types', 
        '_pyreport_extract_variables', 'excluded_names', 'all_globals', 'variables_data'
    }

    result = {}
    
    for name, val in list(globals().items()):
        if not name.startswith('_') and name not in ignore_set and not isinstance(val, types.ModuleType):
            try:
                val_str = ""
                val_type = type(val).__name__

                # 1. Handle NumPy Arrays
                if hasattr(val, 'tolist'):
                    val_str = str(val.tolist())
                
                # 2. Handle User's 'Unit' Class (Duck Typing)
                elif hasattr(val, 'unitTop') and hasattr(val, 'true_value'):
                    val_str = str(val)
                    val_type = "Unit"
                
                # 3. Standard Fallback
                else:
                    val_str = str(val)
                
                result[name] = {"value": val_str, "type": val_type}
            except:
                result[name] = {"value": "<Error>", "type": "Unknown"}
    return result

print("<<VAR_START>>" + json.dumps(_pyreport_extract_variables()) + "<<VAR_END>>")
del _pyreport_extract_variables
`;

        // 3. Inject Extraction Cell
        const edit = new vscode.WorkspaceEdit();
        edit.set(notebook.uri, [
            new vscode.NotebookEdit(new vscode.NotebookRange(lastCellIndex, lastCellIndex), [
                new vscode.NotebookCellData(vscode.NotebookCellKind.Code, pythonCode, 'python')
            ])
        ]);
        await vscode.workspace.applyEdit(edit);

        // 4. Execute Extraction Cell
        const range = new vscode.NotebookRange(lastCellIndex, lastCellIndex + 1);
        editor.selection = range;
        await vscode.commands.executeCommand('notebook.cell.execute');

        // 5. Poll for Output
        const newCell = notebook.cellAt(lastCellIndex);
        let variables = null;

        for (let i = 0; i < 30; i++) {
            if (newCell.outputs.length > 0) {
                const textItem = newCell.outputs[0].items.find(item => item.mime === 'text/plain' || item.mime === 'application/vnd.code.notebook.stdout');
                if (textItem) {
                    const text = new TextDecoder().decode(textItem.data);
                    const match = text.match(/<<VAR_START>>(.*)<<VAR_END>>/);
                    if (match) {
                        variables = JSON.parse(match[1]);
                        break;
                    }
                }
            }
            await new Promise(r => setTimeout(r, 200));
        }

        // 6. Cleanup Extraction Cell
        const deleteEdit = new vscode.WorkspaceEdit();
        deleteEdit.set(notebook.uri, [
            new vscode.NotebookEdit(new vscode.NotebookRange(lastCellIndex, lastCellIndex + 1), [])
        ]);
        await vscode.workspace.applyEdit(deleteEdit);

        // =========================================================
        // 7. PROCESS METADATA & GENERATE REPORT
        // =========================================================
        if (variables) {
            try {
                // A. Read .ipynb file
                const fileContent = await vscode.workspace.fs.readFile(notebook.uri);
                const fileString = new TextDecoder().decode(fileContent);
                const notebookJson = JSON.parse(fileString);

                // B. Logic Pipeline
                variables = extractExpressions(variables, notebookJson);
                variables = detectMatrixes(variables);
                variables = substituteValues(variables);
                variables = findTableCommands(variables, notebookJson);

                // C. Save JSON
                const jsonPath = notebook.uri.path.replace(/\.ipynb$/i, '_vars.json');
                const jsonUri = notebook.uri.with({ path: jsonPath });
                await vscode.workspace.fs.writeFile(jsonUri, new TextEncoder().encode(JSON.stringify(variables, null, 4)));

                // D. GENERATE REPORT
                const reportContent = createFinalReport(variables, notebookJson);
                
                // Save Report (.md)
                const mdPath = notebook.uri.path.replace(/\.ipynb$/i, '_report.md');
                const mdUri = notebook.uri.with({ path: mdPath });
                await vscode.workspace.fs.writeFile(mdUri, new TextEncoder().encode(reportContent));

                vscode.window.showInformationMessage(`Report generated: ${path.basename(mdPath)}`);
                
                const doc = await vscode.workspace.openTextDocument(mdUri);
                await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });

            } catch (err) {
                console.error(err);
                vscode.window.showErrorMessage(`Error processing notebook data: ${err}`);
            }
        } else {
            vscode.window.showErrorMessage('Failed to retrieve variables. Did the notebook run successfully?');
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}