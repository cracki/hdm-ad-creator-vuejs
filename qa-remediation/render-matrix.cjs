const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/issues.json', 'utf8'));
const hdr = `# QA MASTER MATRIX — HDM Ad Creator

Generated from \`issues.json\` (canonical, machine-readable). Statuses updated as remediation progresses.
Baseline: FE \`ad-creator-vue@main b3a190e\` · BE \`ad_creator/django-backend@main ed49cb0\` (deployed: FE app.178.105.224.88.sslip.io, BE api.178.105.224.88.sslip.io = qa4/0fe3a63).

| ID | Severity | Area | Title | Source refs | Primary files | Status |
|---|---|---|---|---|---|---|
`;
const rows = data.issues.map(i => `| ${i.id} | ${i.severity} | ${i.area} | ${i.title} | ${(i.refs||[]).join('; ')} | \`${(i.files||[]).join('`, `')}\` | ${i.status || 'OPEN'} |`).join('\n');
fs.writeFileSync(__dirname + '/QA_MASTER_MATRIX.md', hdr + rows + '\n');
console.log('rows:', data.issues.length);
