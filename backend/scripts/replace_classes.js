import fs from 'fs';

const files = [
  'frontend/src/screens/admin/AdminDashboardScreen.tsx',
  'frontend/src/components/pages/admin/MeetingTable.tsx',
  'frontend/src/components/pages/admin/UserDetailModal.tsx'
];

const replacements = [
  [/hover:bg-slate-100 dark:hover:bg-white\/10/g, 'hover:bg-surface-container'],
  [/bg-slate-200 dark:bg-slate-700/g, 'bg-surface-container-high'],
  [/bg-slate-100 dark:bg-slate-700/g, 'bg-surface-container-high'],
  [/bg-slate-500\/15 text-slate-500 border border-slate-500\/20/g, 'bg-outline-variant/30 text-on-surface-variant border border-outline-variant/40'],
  [/bg-slate-400/g, 'bg-outline-variant'],
  [/bg-slate-500\/15 text-on-surface-variant/g, 'bg-outline-variant/30 text-on-surface-variant']
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(file, content, 'utf-8');
}
console.log('Cleaned up remaining slate classes.');
