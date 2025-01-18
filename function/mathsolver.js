const mathSolver = (msgBody) => {
    // Trim the input
    const sanitizedInput = msgBody.trim();

    // Validate the input with regex to check if it’s a valid math expression
    const isValidEquation = sanitizedInput.match(/^-?\d+(\.\d+)?\s[÷×+\-*/]\s-?\d+(\.\d+)?$/);

    if (!isValidEquation) {
        return { error: 'No valid math equation found in the input.' };
    }

    // Replace symbols for calculation
    const sanitizedEquation = sanitizedInput
        .replace('÷', '/')
        .replace('×', '*');

    // Evaluate the math expression
    try {
        const answer = Math.round(eval(sanitizedEquation)); // Note: Be cautious with eval for untrusted inputs.
        return { question: sanitizedInput, answer };
    } catch (error) {
        return { error: 'Error solving the math equation.', details: error.message };
    }
};

// Example Usage
/*
console.log(mathSolver("342423 + -34")); // { question: '342423 + -34', answer: 342389 }
console.log(mathSolver("342423 ÷ 3"));  // { question: '342423 ÷ 3', answer: 114141 }
console.log(mathSolver("Invalid Input")); // { error: 'No valid math equation found in the input.' }
*/

// Example usage
/*
const msgBody = `
*[Math]*

Jawablah pertanyaan di bawah ini
305895728366774460 ÷ 906

Waktu: 30 detik
Hadiah:
- $300 balance
- 250 XP
`;
*/
//const result = mathSolver(msgBody);
//console.log(result);

export { mathSolver };