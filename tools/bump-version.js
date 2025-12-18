const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
    const packagePath = path.resolve(__dirname, '../package.json');
    const packageJson = require(packagePath);

    // Get total commit count to use as patch version
    // This ensures unique, increasing version numbers for every commit/deploy
    // without needing to commit back to the repo.
    const commitCount = execSync('git rev-list --count HEAD').toString().trim();

    // Keep existing major.minor, replace patch with commit count
    const versionParts = packageJson.version.split('.');
    // Force patch to be the commit count
    const newVersion = `${versionParts[0]}.${versionParts[1]}.${commitCount}`;

    console.log(`Bumping version from ${packageJson.version} to ${newVersion} (based on commit count)`);

    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

} catch (error) {
    console.error('Failed to bump version:', error);
    process.exit(1);
}
