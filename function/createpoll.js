function extractPollOpt(...args) {
    const index = args[1] === true ? 3 : 2; // Determines the starting index
    const pollOptions = args[0]; // Save the array from args[0]

    // Get all values starting from the index
    const resultOptions = pollOptions.slice(index);

    return resultOptions; // Log the resulting array
}

// Example usage:
/*
createPoll(['Option1', 'Option2', 'Option3', 'Option4'], true); // Result: ['Option3', 'Option4']
createPoll(['Option1', 'Option2', 'Option3', 'Option4'], false); // Result: ['Option2', 'Option3', 'Option4']
*/

export { extractPollOpt };