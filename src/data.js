// The four categories act as drop targets. `id` is used as a stable key
// for state + drop-zone identity; `title` is the display label.
export const CATEGORIES = [
  { id: 'who-i-am', title: 'This is Who I Am' },
  { id: 'who-i-am-not', title: 'This is Who I Am Not' },
  { id: 'not-sure', title: 'I Am Not Sure If This is Who I Am' },
  { id: 'who-i-want-to-be', title: 'This Is Who I Want to Be' },
]

export const ROLES = [
  'Adolescent', 'Child', 'Adult', 'Elder', 'Beauty', 'Seducer/Seductress',
  'Beast', 'Crazy One', 'Healer', 'Fool/Simpleton', 'Clown', 'Critic',
  'Wise One', 'Scholar', 'Innocent', 'Survivor', 'Lost One', 'Rebel',
  'Lover', 'Hothead', 'Demon', 'Priest', 'Idealist', 'Martyr', 'Helper',
  'Miser', 'Coward', 'Mother', 'Wife', 'Widow/Widower', 'Father', 'Husband',
  'Son', 'Daughter', 'Sister', 'Brother', 'Perpetrator', 'Victim', 'Witness',
  'Warrior', 'Killer', 'Hero', 'Goddess/God', 'Witch/Sorceress', 'Artist',
  'Villain', 'Parasite', 'Cynic', 'Peacemaker', 'Lawyer', 'Judge', 'Tyrant',
  'Cuckold', 'Trickster', 'Orphan', 'Bigot', 'Sinner', 'Dreamer', 'Radical',
  'Servant', 'Saint', 'Spiritual Leader', 'Egotist', 'Average Person/Chorus',
]

export const INTRO_TEXT =
  'Review the roles below and consider what each role means to you. ' +
  'When you are ready, place each role in one or more of the four categories. ' +
  'You can change your choices at any time.'

export const STORAGE_KEY = 'role-reflection.v1'

// The open text fields at the bottom of the page. `id` is a stable key for
// localStorage + export; `title` is the prompt shown above the editor.
export const NOTE_FIELDS = [
  {
    id: 'standout',
    title: 'Which roles stand out to you the most?',
  },
  {
    id: 'surprised',
    title: 'Which roles surprised you?',
  },
  {
    id: 'other',
    title: 'Anything else you noticed',
  },
]

export const NOTES_STORAGE_KEY = 'role-reflection.notes.v1'
