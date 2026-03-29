#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Diagnostic script to isolate file writing issues
 */

const home = Deno.env.get("HOME") || "/tmp";
const outputDir = `${home}/Downloads/generated-shortcuts`;
const testName = "diagnostic-test";

console.log("=== Diagnostic Test ===\n");

// Step 1: Check if directory exists
console.log("1. Checking output directory...");
try {
  const stat = await Deno.stat(outputDir);
  console.log(`   ✅ Directory exists: ${stat.isDirectory}`);
} catch (e) {
  console.log(`   ❌ Directory error: ${e}`);
  console.log("   Creating directory...");
  await Deno.mkdir(outputDir, { recursive: true });
}

// Step 2: List current contents
console.log("\n2. Current directory contents:");
try {
  for await (const entry of Deno.readDir(outputDir)) {
    console.log(`   - ${entry.name}`);
  }
} catch (e) {
  console.log(`   ❌ Could not list: ${e}`);
}

// Step 3: Write a simple text file
console.log("\n3. Writing simple text file...");
const simpleTextPath = `${outputDir}/${testName}.txt`;
await Deno.writeTextFile(simpleTextPath, "Hello World");
try {
  const stat = await Deno.stat(simpleTextPath);
  console.log(`   Deno.stat says: ${stat.size} bytes`);
} catch (e) {
  console.log(`   ❌ Deno.stat failed: ${e}`);
}

// Step 4: Verify with shell ls
console.log("\n4. Verifying with shell ls...");
const lsCmd = new Deno.Command("ls", {
  args: ["-la", simpleTextPath],
});
const lsResult = await lsCmd.output();
if (lsResult.success) {
  console.log(`   Shell ls: ${new TextDecoder().decode(lsResult.stdout)}`);
} else {
  console.log(`   Shell ls failed: ${new TextDecoder().decode(lsResult.stderr)}`);
}

// Step 5: Write XML plist
console.log("\n5. Writing XML plist...");
const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>test</key>
    <string>value</string>
</dict>
</plist>`;
const xmlPath = `${outputDir}/${testName}.xml`;
await Deno.writeTextFile(xmlPath, xmlContent);
try {
  const stat = await Deno.stat(xmlPath);
  console.log(`   Deno.stat says: ${stat.size} bytes`);
} catch (e) {
  console.log(`   ❌ Deno.stat failed: ${e}`);
}

// Step 6: Verify XML with shell
console.log("\n6. Verifying XML with shell cat...");
const catCmd = new Deno.Command("cat", {
  args: [xmlPath],
});
const catResult = await catCmd.output();
if (catResult.success) {
  console.log(`   Shell cat output length: ${catResult.stdout.length} bytes`);
} else {
  console.log(`   Shell cat failed: ${new TextDecoder().decode(catResult.stderr)}`);
}

// Step 7: Convert to binary plist with plutil
console.log("\n7. Converting to binary plist...");
const binaryPath = `${outputDir}/${testName}.binary`;
const plutilCmd = new Deno.Command("plutil", {
  args: ["-convert", "binary1", "-o", binaryPath, xmlPath],
});
const plutilResult = await plutilCmd.output();
console.log(`   plutil success: ${plutilResult.success}`);
if (!plutilResult.success) {
  console.log(`   plutil stderr: ${new TextDecoder().decode(plutilResult.stderr)}`);
}

// Step 8: Verify binary with shell
console.log("\n8. Verifying binary file...");
try {
  const stat = await Deno.stat(binaryPath);
  console.log(`   Deno.stat says: ${stat.size} bytes`);
} catch (e) {
  console.log(`   ❌ Deno.stat failed: ${e}`);
}

const lsBinaryCmd = new Deno.Command("ls", {
  args: ["-la", binaryPath],
});
const lsBinaryResult = await lsBinaryCmd.output();
if (lsBinaryResult.success) {
  console.log(`   Shell ls: ${new TextDecoder().decode(lsBinaryResult.stdout)}`);
} else {
  console.log(`   Shell ls failed: ${new TextDecoder().decode(lsBinaryResult.stderr)}`);
}

// Step 9: Test with shell-based plutil (like generator.ts does)
console.log("\n9. Testing shell-based plutil...");
const binaryPath2 = `${outputDir}/${testName}.binary2`;
const shellPlutilCmd = new Deno.Command("sh", {
  args: ["-c", `plutil -convert binary1 -o '${binaryPath2}' '${xmlPath}'`],
});
const shellPlutilResult = await shellPlutilCmd.output();
console.log(`   Shell plutil success: ${shellPlutilResult.success}`);
if (!shellPlutilResult.success) {
  console.log(`   stderr: ${new TextDecoder().decode(shellPlutilResult.stderr)}`);
}

// Step 10: Final directory listing
console.log("\n10. Final directory listing (via shell):");
const finalLsCmd = new Deno.Command("ls", {
  args: ["-la", outputDir],
});
const finalLsResult = await finalLsCmd.output();
console.log(new TextDecoder().decode(finalLsResult.stdout));

// Cleanup
console.log("\n11. Cleaning up test files...");
try {
  await Deno.remove(simpleTextPath);
  await Deno.remove(xmlPath);
  await Deno.remove(binaryPath);
  await Deno.remove(binaryPath2);
  console.log("   ✅ Cleanup complete");
} catch (e) {
  console.log(`   ⚠️ Cleanup issues: ${e}`);
}

console.log("\n=== Diagnostic Complete ===");
