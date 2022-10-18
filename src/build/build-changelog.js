const exec = require('child_process').execSync;
const fs = require('fs');

// starting from b74b99e all messages are fine... hopefully :)
const stdout = exec('git log --pretty="%h %ct %s" --no-merges b74b99e..');
const lines = stdout.toString().split('\n');
const changes = [];

function find_entry(line) {
    const m = line.match(/(build|ci|docs|feat|feature|fix|perf|refactor|refator|style|test)\(([^)]+)\):\s(.+)/);
    if (m) {
        return m.slice(1);
    } else {
        return null;
    }
}

for (const line of lines) {
    if (!line) {
        continue;
    }

    // don't include changelog updates in the changelog
    if (line.search(/docs\(changelog\)/) !== -1) {
        continue;
    }

    const [_, commit, timestamp, message] = line.match(/^(\S+)\s(\S+)\s(.+)$/);

    const entry = find_entry(message);
    if (entry) {
        changes.push([commit, timestamp].concat(entry));
    } else {
        // maybe it's a squash commit? Look inside
        const lines = exec(`git show -s ${commit}`).toString().split('\n');
        for (const line of lines) {
            const entry = find_entry(line);
            if (entry) {
                changes.push([commit, timestamp].concat(entry));
            }
        }
    }
}

let changes_file = fs.readFileSync('src/app/changelog/changes.ts').toString();
const changes_data = `const changes = ${JSON.stringify(changes, null, 4)};\n`;
const re = /(?<=BEGIN:AUTOGENERATED\s+)([\s\S]+?)\s+(?=\/\/ END:AUTOGENERATED)/;
changes_file = changes_file.replace(re, changes_data);

fs.writeFileSync('src/app/changelog/changes.ts', changes_file);
console.log('changes.ts updated');
