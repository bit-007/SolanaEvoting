// server/scripts/check-idl.js
const fs = require('fs');
const path = require('path');

try {
  // Path to your IDL file
  const idlPath = path.join(__dirname, '../idl/evoting.json');
  
  console.log("Checking IDL file at:", idlPath);
  
  // Check if file exists
  if (!fs.existsSync(idlPath)) {
    console.error("IDL file not found!");
    process.exit(1);
  }
  
  // Read and parse IDL file
  const idlContent = fs.readFileSync(idlPath, 'utf8');
  const idl = JSON.parse(idlContent);
  
  console.log("IDL parsed successfully!");
  
  // Check required IDL properties
  console.log("IDL Version:", idl.version || "not specified");
  console.log("IDL Name:", idl.name || "not specified");
  
  if (!idl.instructions || !Array.isArray(idl.instructions)) {
    console.error("Missing or invalid 'instructions' array in IDL");
  } else {
    console.log("Found", idl.instructions.length, "instructions");
  }
  
  if (!idl.accounts || !Array.isArray(idl.accounts)) {
    console.error("Missing or invalid 'accounts' array in IDL");
  } else {
    console.log("Found", idl.accounts.length, "accounts");
  }
  
  // Check if metadata contains program ID
  if (idl.metadata && idl.metadata.address) {
    console.log("Program ID in IDL:", idl.metadata.address);
  } else {
    console.error("No program ID found in IDL metadata");
  }
  
  console.log("\nIDL structure check complete");
} catch (error) {
  console.error("Error checking IDL:", error);
}