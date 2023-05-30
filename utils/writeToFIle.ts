   
const fs = require("fs-extra")
require("dotenv").config()

let array: any = [];
   
const jsonData = JSON.stringify(array, null, 2);
                
fs.writeFile("./.squidChains.json", jsonData, (err: any) => {
    if (err) {
    console.error('An error occurred while writing to the file:', err);
    } else {
    console.log('File written successfully.');
    }
});