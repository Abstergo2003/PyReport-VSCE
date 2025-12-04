import { normalizeListString } from "./helper";

export const symbols = [
    "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa",
    "lambda", "mu", "nu", "xi", "omicron", "pi", "rho", "sigma", "tau", "upsilon", "phi",
    "chi", "psi", "omega", "Delta", "Gamma", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi",
    "Psi", "Omega", "nabla", "partial", "infinity"
];


export function simplifyUnitBlock(text: string): string {
    const parts = text.split('*').map(p => p.trim()).filter(p => p);
    const counts = new Map<string, number>();
    
    parts.forEach(p => counts.set(p, (counts.get(p) || 0) + 1));
    
    return Array.from(counts.entries()).map(([unit, count]) => {
        // Handle subscripts in unit names recursively
        const cleanUnit = unit.replace(/_([a-zA-Z0-9]+)/g, "_{$1}"); 
        return count > 1 ? `${cleanUnit}^{${count}}` : cleanUnit;
    }).join(' \\cdot '); // Use dot separator for clean LaTeX
}

// Scans string for [ ... ] patterns and simplifies the units inside
export function simplifyUnits(input: string): string {
    if (!input) {return "";}
    
    // Regex matches [content]
    return input.replace(/\[(.*?)\]/g, (match, content) => {
        // Check for fraction (numerator / denominator)
        if (content.includes('/')) {
            const [top, bot] = content.split('/').map((s: any) => s.trim());
            const simpleTop = simplifyUnitBlock(top);
            const simpleBot = simplifyUnitBlock(bot);
            // If top is empty (e.g. [ / s]), treat as 1
            const finalTop = simpleTop || "1";
            return `[${finalTop} / ${simpleBot}]`;
        } else {
            // Simple unit list
            return `[${simplifyUnitBlock(content)}]`;
        }
    });
}

export function formatToLatex(input: string): string {
    if (!input) {return "";}
    
    // 1. Simplify Units first (cm*cm -> cm^2)
    let processed = simplifyUnits(input);

    // 2. Handle Exponentials (Python ** -> LaTeX ^)
    processed = processed.replace(/\*\*/g, '^');
    // Wrap exponent in braces if it consists of alphanumeric characters, dots, or minus signs
    // e.g. x^2 -> x^{2}, x^0.5 -> x^{0.5}, x^-1 -> x^{-1}
    processed = processed.replace(/\^([a-zA-Z0-9\.-]+)/g, "^{$1}");

    // 3. Handle Greek letters
    symbols.sort((a, b) => b.length - a.length);
    symbols.forEach(sym => {
        const regex = new RegExp(`\\b${sym}\\b`, 'g');
        processed = processed.replace(regex, `\\${sym}`);
    });

    // 4. Handle subscripts
    processed = processed.replace(/_([a-zA-Z0-9]+)/g, "_{$1}");

    return processed;
}

export function printExpression(v: any, key: string) {
    const name = formatToLatex(key);
    
    let rawExpr = v.expression || "";
    let rawRepl = v.replaced || "";
    
    rawExpr = rawExpr.replaceAll(".true_value", "");
    rawRepl = rawRepl.replaceAll(".true_value", "");

    const expr = formatToLatex(rawExpr);
    const repl = formatToLatex(rawRepl);
    const val = formatToLatex(v.value); 

    if (rawExpr.includes("Unit(") || rawExpr.includes("Unit (")) {
        return `$ ${name} = ${val} $ \n\n`;
    }

    if (expr.replace(/\s/g, '') === repl.replace(/\s/g, '')) {
        return `$ ${name} = ${val.replace("[]", "")} $ \n\n`;
    }

    return `$ ${name} = ${expr.replaceAll(".auto_{scale}()", "").replaceAll("[]", "").replaceAll("**", "^")} = ${repl.replaceAll(".auto_{scale}()", "").replaceAll("[]", "").replaceAll("**", "^")} = ${val.replace("[]", "")} $ \n\n`;
}

export function printTable(v: any, key: string) {
    const formattedKey = formatToLatex(key);
    let string = `
    *${formattedKey}* \n
    | Item | Expression | Replaced | Value |
    |---|---|---|---|
    `;

    let values: any[] = [];
    try { 
        values = JSON.parse(v.value); 
    } catch { 
        try { values = JSON.parse(normalizeListString(v.value)); } catch { values = [v.value]; }
    }

    let expressions: any[] = [];
    try {
        expressions = JSON.parse(normalizeListString(v.expression));
    } catch {
        expressions = [v.expression];
    }

    let replaced: any[] = [];
    try {
        replaced = JSON.parse(normalizeListString(v.replaced));
    } catch {
        replaced = [v.replaced];
    }

    let names: any[] = [];
    try {
        names = JSON.parse(v.tableItems);
    } catch {
        names = [];
    }
    
    const len = names.length;
    
    for (let i = 0; i < len; i++) {
        const itemName = names[i] ? formatToLatex(names[i]) : '';
        const itemExpr = expressions[i] ? formatToLatex(expressions[i]) : '';
        const itemRepl = replaced[i] ? formatToLatex(replaced[i]) : '';
        // Apply unit formatting to table values too
        const rawVal = values[i] !== undefined ? values[i] : '';
        const itemVal = formatToLatex(String(rawVal)); 
        
        string += `| ${itemName} | ${itemExpr} | ${itemRepl} | ${itemVal} | \n`;
    }
    return string + "\n\n";
}

export function printMatrixes(v: any, key: string) {
    const name = formatToLatex(key);
    let output = `$$ ${name}`;
    
    if (v.expression) {
        output += ` = ${v.expression}`;
    }
    
    const cleanReplaced = v.replaced ? v.replaced.replace(/\s/g, '') : '';
    const cleanExpr = v.expression ? v.expression.replace(/\s/g, '') : '';
    const cleanLatexVal = v.latexValue ? v.latexValue.replace(/\s/g, '') : '';

    if (v.replaced && cleanReplaced !== cleanExpr && cleanReplaced !== cleanLatexVal) {
        output += ` = ${v.replaced}`;
    }
    
    if (v.latexValue && cleanLatexVal !== cleanExpr && cleanLatexVal !== cleanReplaced) {
        output += ` = ${v.latexValue}`;
    }
    
    output += ` $$\n`;
    return output;
}