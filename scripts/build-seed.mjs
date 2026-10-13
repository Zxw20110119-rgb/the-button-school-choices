import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/questions.js',import.meta.url),'utf8');const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(source,sandbox);const questions=sandbox.window.QUESTION_BANK;
const esc=s=>`'${String(s).replaceAll("'","''")}'`;
const rows=questions.map(q=>`(${q.id},${esc(q.benefit_text)},${esc(q.consequence_text)},${esc(q.category)},${esc(q.press_value)},${esc(q.walk_value)},true,1,true,false)`).join(',\n');
fs.mkdirSync(new URL('../data/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../data/questions.json',import.meta.url),JSON.stringify(questions,null,2));
fs.writeFileSync(new URL('../supabase/seed.sql',import.meta.url),`insert into public.questions(id,benefit_text,consequence_text,category,press_value,walk_value,active,version,real_votes_enabled,optional_test_mode) values\n${rows}\non conflict(id) do update set benefit_text=excluded.benefit_text,consequence_text=excluded.consequence_text,category=excluded.category,press_value=excluded.press_value,walk_value=excluded.walk_value,version=excluded.version;\nselect setval(pg_get_serial_sequence('public.questions','id'),greatest((select max(id) from public.questions),1));\n`);
console.log(`Built seed files for ${questions.length} questions.`);
