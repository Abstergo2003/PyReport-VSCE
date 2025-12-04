## PyReport 📝

**Turn your Jupyter Notebooks into professional engineering reports instantly.**

PyReport is a Visual Studio Code extension designed for engineers, students, and data scientists who use Jupyter Notebooks for calculations. It automatically extracts your variables, matrices, and expressions, converting them into a beautifully formatted Markdown report with LaTeX equations.

🚀 Key Features:
* Automatic LaTeX Conversion: Turns Python code like alpha = 30 or res = A @ B into professional LaTeX equations:$$\alpha = 30$$$$res = A \cdot B = \begin{pmatrix}... \end{pmatrix}$$
* Smart Matrix Support: Automatically detects NumPy arrays and lists of lists, formatting them as LaTeX matrices (pmatrix). It even shows the symbolic matrix multiplication step!
* Fully supports my [custom units module](https://github.com/Abstergo2003/Miscellaneous/tree/main/PyUnit). It identifies Unit objects, simplifies complex units (e.g., cm * cm $\rightarrow$ $cm^2$), and handles metric prefix formatting automatically.
* Markdown Injection: Write report text directly inside your code cells using # md: comments. No need to constantly switch between cell types.
* Live Variable Extraction: Runs your notebook to capture the actual runtime values of your variables, ensuring your report never shows outdated data.
* Custom Tables: Generate summary tables of your results using simple comment syntax.

📦 Installation:
1. Open Visual Studio Code.Go to the Extensions view (Ctrl+Shift+X).
2. Search for PyReport.
3. Click Install.
Note: This extension requires the Microsoft Jupyter extension to function.📖 

Usage
1. Open a Jupyter Notebook (.ipynb).
2. Write your code and definitions.
3. Click the "Generate PyReport" button in the editor toolbar (top right).
4. Alternatively, open the Command Palette (Ctrl+Shift+P) and run PyReport: Get Variables.
5. The extension will forcibly run your notebook to ensure data integrity and then generate a _report.md file in the same directory.

✍️ Syntax Guide
1. Basic VariablesAny variable defined in a code cell is extracted. Python syntax is automatically converted to LaTeX (e.g., ** becomes ^, Greek names like alpha become \alpha).Input (Python):
```python
alpha = 30
sigma_yield = 235
# md: We calculate the safety factor below.
safety_factor = sigma_yield / 1.5
```
Output (Report):
$$ \alpha = 30 $$$$ \sigma_{yield} = 235 $$We calculate the safety factor below.$$ safety_{factor} = \sigma_{yield} / 1.5 = 235 / 1.5 = 156.6667 $$

2. Matrices & ArraysNumPy arrays are automatically detected and rendered as LaTeX matrices. Matrix multiplication (@) is rendered as a dot product ($\cdot$).Input:
```python
import numpy as np
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])
C = A @ B
```
Output:
$$ C = A \cdot B = 
\begin{pmatrix} 
1 & 2 \\
3 & 4 \\
\end{pmatrix} \cdot 
\begin{pmatrix} 
5 & 6 \\ 
7 & 8 \\
\end{pmatrix} = 
\begin{pmatrix} 
19 & 22 \\ 
43 & 50 \\
\end{pmatrix} $$

3. Markdown InjectionDon't want to create a new Markdown cell just for one sentence? Use the # md: prefix in your code.# md: ## Structural Analysis
```python
# md: First, we define the **geometry** of the beam.
L = 5.0
```
4. Custom Units Module SupportThe extension automatically detects instances of your Unit class. It simplifies unit arithmetic and renders the final value with the correct metric prefixes and dimensions.Input:# Assuming Unit class is imported
```python
F = Unit(10, 'k', 'N', '')  # 10 kN
L = Unit(5, '', 'm', '')    # 5 m
# Moment calculation
M = F * L
```
Output:
$$ F = 10 [kN] $$$$ L = 5 [m] $$$$ M = F \cdot L = 10 [kN] \cdot 5 [m] = 50 [kN \cdot m] $$
5. Result TablesYou can generate summary tables using the PyRaport:table syntax in a comment above the relevant code block.Syntax: # PyRaport:table[Table Title][Column1, Column2, ...]
Input:
```python
# PyRaport:table[Beam Loads][Force, Moment, Deflection]
results = [100, 50, 2.5] 
```
Output:

*Beam Loads*
| Item | Expression | Replaced | Value |
|---|---|---|---|
| Force | ... | ... | 100 |
| Moment | ... | ... | 50 |
| Deflection | ... | ... | 2.5 |

🛠️ Requirements
* VS Code ^1.80.0
* Python 3.x
* Jupyter Extension for VS Code👨‍💻 