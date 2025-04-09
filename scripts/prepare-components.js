// scripts/prepare-components.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentsDir = path.join(__dirname, '..', 'src', 'components');
const ignoreDirs = ['ui'];
// --- End Configuration ---

// --- Get Target Environment ---
const args = process.argv.slice(2);
const targetArg = args.find(arg => arg.startsWith('--target='));
if (!targetArg) {
  console.error('Error: Target environment not specified. Use --target=web or --target=desktop');
  process.exit(1);
}
const targetEnv = targetArg.split('=')[1];
if (targetEnv !== 'web' && targetEnv !== 'desktop') {
  console.error(`Error: Invalid target environment "${targetEnv}". Use 'web' or 'desktop'.`);
  process.exit(1);
}
console.log(`Preparing components for target: ${targetEnv}`);
// --- End Get Target Environment ---

// --- Helper Functions ---

// **UPDATED LOGIC**
function findComponentDirsRecursively(dir, componentDirs = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // Skip explicitly ignored directories at the top level of componentsDir
            if (dir === componentsDir && ignoreDirs.includes(entry.name)) {
                 console.log(`Skipping ignored directory: ${fullPath}`);
                continue;
            }

            // **NEW HEURISTIC:** Check if the directory name suggests it's a component
            // (e.g., PascalCase) AND contains files following the convention.
            // Or simply, always recurse and check inside for the specific files.
            // Let's stick to checking for the convention files inside.

            const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
            const componentName = entry.name; // Base name of the directory
            const webFile = `${componentName}.web.tsx`;
            const desktopFile = `${componentName}.desktop.tsx`;
            const defaultFile = `${componentName}.tsx`;

            // Check if files matching the convention exist *inside* this directory
            const hasConventionFiles = subEntries.some(subEntry =>
                subEntry.isFile() &&
                (subEntry.name === webFile || subEntry.name === desktopFile || subEntry.name === defaultFile)
            );

            if (hasConventionFiles) {
                // This directory IS a component directory (e.g., EnvironmentIndicator)
                console.log(`  -> Found component directory: ${fullPath}`);
                componentDirs.push(fullPath);
            }

            // **ALWAYS RECURSE:** Continue searching inside this directory
            // for other potential component directories, regardless of whether
            // it was identified as one itself or contains other .tsx files.
            findComponentDirsRecursively(fullPath, componentDirs);

        }
    }
    return componentDirs;
}


function generateIndexFile(componentDir) {
  const componentName = path.basename(componentDir);
  // Files must be directly inside the identified componentDir
  const webFile = `${componentName}.web.tsx`;
  const desktopFile = `${componentName}.desktop.tsx`;
  const defaultFile = `${componentName}.tsx`;
  const indexPath = path.join(componentDir, 'index.ts');

  const webExists = fs.existsSync(path.join(componentDir, webFile));
  const desktopExists = fs.existsSync(path.join(componentDir, desktopFile));
  const defaultExists = fs.existsSync(path.join(componentDir, defaultFile));

  let targetFile = '';
  let exportLine = '';
  let source = '';

  if (targetEnv === 'web') {
    if (webExists) {
      targetFile = webFile; source = 'web';
    } else if (defaultExists) {
      targetFile = defaultFile; source = 'default';
      console.log(`    [${componentName}] Web specific not found, using default (${defaultFile}).`);
    }
  } else if (targetEnv === 'desktop') {
    if (desktopExists) {
      targetFile = desktopFile; source = 'desktop';
    } else if (defaultExists) {
      targetFile = defaultFile; source = 'default';
      console.log(`    [${componentName}] Desktop specific not found, using default (${defaultFile}).`);
    }
  }

  if (targetFile) {
    exportLine = `/* eslint-disable */\n// Auto-generated index file for target: ${targetEnv}\n// Selected source: ${source}\n`;
    exportLine += `export { default } from './${targetFile.replace(/\.tsx$/, '')}';\n`;
    // exportLine += `export * from './${targetFile.replace(/\.tsx$/, '')}';\n`; // Add if needed
     console.log(`    [${componentName}] Generating index.ts -> ./${targetFile}`);
  } else {
     // This case should ideally not happen if findComponentDirsRecursively is correct
    console.error(`Error: [${componentName}] Identified as component dir, but no suitable file found for target "${targetEnv}" in ${componentDir}.`);
     exportLine = `/* eslint-disable */\n// ERROR: No suitable file found\nexport default {};\n`;
  }

   try {
       let existingContent = '';
        if (fs.existsSync(indexPath)) {
           existingContent = fs.readFileSync(indexPath, 'utf-8');
       }
       if (existingContent !== exportLine) {
            fs.writeFileSync(indexPath, exportLine, 'utf-8');
       }
   } catch (err) {
        console.error(`Error writing index.ts for ${componentName}:`, err);
         process.exit(1);
   }
}
// --- End Helper Functions ---

// --- Main Execution ---
console.log(`Scanning for component directories in ${componentsDir}...`);
try {
    const componentDirsFound = findComponentDirsRecursively(componentsDir); // Renamed variable
    if (componentDirsFound.length === 0) {
        console.warn("Warning: No component directories identified based on file convention.");
    } else {
        console.log(`Processing identified component directories: \n - ${componentDirsFound.join('\n - ')}`);
        componentDirsFound.forEach(generateIndexFile); // Process only the identified ones
    }
    console.log('Component preparation complete.');
} catch (err) {
    console.error("Error during component preparation:", err);
    process.exit(1);
}
// --- End Main Execution ---




// import fs from 'fs'; // Use ES module import
// import path from 'path'; // Use ES module import
// import { fileURLToPath } from 'url'; // Helper to convert file URL to path

// // --- Configuration ---
// // Get the directory name using import.meta.url for ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const componentsDir = path.join(__dirname, '..', 'src', 'components');
// const ignoreDirs = ['ui']; // Directories to completely ignore scanning
// // --- End Configuration ---

// // --- Get Target Environment ---
// const args = process.argv.slice(2);
// const targetArg = args.find(arg => arg.startsWith('--target='));
// if (!targetArg) {
//   console.error('Error: Target environment not specified. Use --target=web or --target=desktop');
//   process.exit(1);
// }
// const targetEnv = targetArg.split('=')[1];
// if (targetEnv !== 'web' && targetEnv !== 'desktop') {
//   console.error(`Error: Invalid target environment "${targetEnv}". Use 'web' or 'desktop'.`);
//   process.exit(1);
// }
// console.log(`Preparing components for target: ${targetEnv}`);
// // --- End Get Target Environment ---

// // --- Helper Functions ---
// function findComponentDirsRecursively(dir, componentDirs = []) {
//     const entries = fs.readdirSync(dir, { withFileTypes: true });

//     for (const entry of entries) {
//         const fullPath = path.join(dir, entry.name);
//         if (entry.isDirectory()) {
//             // Skip explicitly ignored directories at the top level of componentsDir
//             if (dir === componentsDir && ignoreDirs.includes(entry.name)) {
//                  console.log(`Skipping ignored directory: ${fullPath}`);
//                 continue;
//             }

//             // Check if this directory looks like a component directory
//             // A simple heuristic: does it contain *any* .tsx file directly?
//             const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
//             const hasTsxFile = subEntries.some(subEntry => subEntry.isFile() && subEntry.name.endsWith('.tsx'));

//             if (hasTsxFile) {
//                 // Assume this is a component directory
//                 componentDirs.push(fullPath);
//             } else {
//                 // Otherwise, recurse into the subdirectory
//                 findComponentDirsRecursively(fullPath, componentDirs);
//             }
//         }
//     }
//     return componentDirs;
// }


// function generateIndexFile(componentDir) {
//   const componentName = path.basename(componentDir);
//   const webFile = `${componentName}.web.tsx`;
//   const desktopFile = `${componentName}.desktop.tsx`;
//   const defaultFile = `${componentName}.tsx`; // Default/common file
//   const indexPath = path.join(componentDir, 'index.ts');

//   const webExists = fs.existsSync(path.join(componentDir, webFile));
//   const desktopExists = fs.existsSync(path.join(componentDir, desktopFile));
//   const defaultExists = fs.existsSync(path.join(componentDir, defaultFile)); // Check for default

//   let targetFile = '';
//   let exportLine = '';
//   let source = ''; // To track which file was chosen

//   if (targetEnv === 'web') {
//     if (webExists) {
//       targetFile = webFile;
//       source = 'web';
//     } else if (defaultExists) {
//       targetFile = defaultFile;
//       source = 'default';
//       console.log(`  [${componentName}] Web specific not found, using default (${defaultFile}).`);
//     }
//   } else if (targetEnv === 'desktop') {
//     if (desktopExists) {
//       targetFile = desktopFile;
//       source = 'desktop';
//     } else if (defaultExists) {
//       targetFile = defaultFile;
//       source = 'default';
//       console.log(`  [${componentName}] Desktop specific not found, using default (${defaultFile}).`);
//     }
//   }

//   if (targetFile) {
//     // Use re-export syntax. Assumes default export primarily.
//     // Add /* eslint-disable */ to avoid potential linting issues with generated files.
//     exportLine = `/* eslint-disable */\n// Auto-generated index file for target: ${targetEnv}\n// Selected source: ${source}\n`;
//     exportLine += `export { default } from './${targetFile.replace(/\.tsx$/, '')}';\n`;
//     // If you also need named exports:
//     // exportLine += `export * from './${targetFile.replace(/\.tsx$/, '')}';\n`;
//      console.log(`  [${componentName}] Generating index.ts -> ./${targetFile}`);
//   } else {
//     console.warn(`Warning: [${componentName}] No suitable component file found for target "${targetEnv}" in ${componentDir}. Generating empty export.`);
//     // Export an empty object or similar placeholder if no file is found
//      exportLine = `/* eslint-disable */\n// Auto-generated index file for target: ${targetEnv}\n// Warning: No suitable component file found.\n`;
//      // Provide a basic React component that logs an error, useful for debugging.
//      exportLine += `import React from 'react';\n`;
//      exportLine += `const NotFoundComponent: React.FC = () => { console.error("Component '${componentName}' not found for target '${targetEnv}'"); return React.createElement('div', { style: { color: 'red', border: '1px solid red', padding: '5px' } }, 'Error: Component ${componentName} not found for ${targetEnv}'); };\n`;
//      exportLine += `export default NotFoundComponent;\n`;
//   }

//    try {
//        // Read existing content only if file exists
//        let existingContent = '';
//         if (fs.existsSync(indexPath)) {
//            existingContent = fs.readFileSync(indexPath, 'utf-8');
//        }
//        // Write file only if content has changed to avoid unnecessary HMR/rebuild triggers
//        if (existingContent !== exportLine) {
//             fs.writeFileSync(indexPath, exportLine, 'utf-8');
//        }
//    } catch (err) {
//         console.error(`Error writing index.ts for ${componentName}:`, err);
//          process.exit(1);
//    }
// }
// // --- End Helper Functions ---


// // --- Main Execution ---
// console.log(`Scanning for component directories in ${componentsDir}...`);
// try {
//     const componentDirs = findComponentDirsRecursively(componentsDir);
//     if (componentDirs.length === 0) {
//         console.warn("Warning: No component directories found to process.");
//     } else {
//         console.log(`Found component directories: \n - ${componentDirs.join('\n - ')}`);
//         componentDirs.forEach(generateIndexFile);
//     }
//     console.log('Component preparation complete.');
// } catch (err) {
//     console.error("Error during component preparation:", err);
//     process.exit(1);
// }
// // --- End Main Execution ---
