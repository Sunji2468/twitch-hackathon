import { ingest, type Engine } from './engine';
export const topics = [
  { id: 'character', title: 'Why did you choose that character?', texts: ['Why did you pick this character?', 'What made you choose that character?', 'Why this character over the others?', 'Is there a reason you picked that character?'] },
  { id: 'schedule', title: 'When is your next stream?', texts: ['When are you streaming next?', 'What is your stream schedule?', 'Are you going live tomorrow?', 'When can we catch the next stream?'] },
  { id: 'build', title: 'Can you explain your current build?', texts: ['Can you show us your build?', 'What gear are you running?', 'What is your current build?', 'Could you explain the loadout?'] },
  { id: 'game', title: 'What game are you playing?', texts: ['What game is this?', 'Anyone know the name of this game?', 'What are we playing today?'] },
];
const names = ['pixelpilot', 'moonbean', 'cozycrit', 'neonfox', 'lunarloop', 'tinywizard', 'cloudnine', 'mossybyte', 'starling', 'peachygg', 'orbitkid', 'nightowl'];
export const scenarios = {
  mixed: { label: 'Mixed topics', description: 'Six messages per batch across four topics and reactions.' },
  repeated: { label: 'Repeated questions', description: 'Twenty messages per batch, with one persistent chatter. Counts stay unique.' },
  burst: { label: 'Chat burst', description: 'Sixty messages per batch across four topics, including reactions.' },
};
export type Scenario = keyof typeof scenarios;
export function demoBatch(e: Engine, step: number, now: number, scripted = true, scenario: Scenario = 'mixed') {
  const size = scenario === 'burst' ? 60 : scenario === 'repeated' ? 20 : 6;
  for (let j = 0; j < size; j++) {
    const n = step * size + j;
    const topic = topics[scenario === 'repeated' ? 0 : [0, 1, 0, 2, 0, 3, 1, 2, 0, 1, 0, 2][n % 12]];
    const user = scenario === 'repeated' ? (j < 16 ? 0 : n % 53) : n % 9 === 0 ? 0 : n % 53;
    const username = names[user % names.length] + (user >= names.length ? String(Math.floor(user / names.length)) : '');
    const reaction = scenario !== 'repeated' && n % 7 === 6;
    ingest(e, { id: `demo-${scenario}-${n}`, userId: `viewer-${user}`, username, text: reaction ? ['LET’S GOOO', 'LUL LUL', 'that was clean', 'PogChamp'][n % 4] : topic.texts[n % topic.texts.length], at: now }, reaction || !scripted ? null : topic, now);
  }
}
