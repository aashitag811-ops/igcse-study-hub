import { MarkRule } from '@/lib/exam/types';

export const ICT_0417_12_FM_2025_PAPER_ID = '0417_2025_feb_march_12';

export const ICT_0417_12_FM_2025_RULES: MarkRule[] = [
  {
    qid: '1',
    answerType: 'multi_select',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'keyboard', acceptable: ['keyboard'], marks: 1, strictness: 'technical' },
      { id: 'mouse', acceptable: ['mouse'], marks: 1, strictness: 'technical' },
    ],
  },
  {
    qid: '2ai',
    answerType: 'short_text',
    maxMarks: 2,
    cap: 2,
    components: [
      {
        id: 'spreadsheet_program',
        description: 'States spreadsheet is a computer program.',
        marks: 1,
        acceptable: ['computer program', 'software application'],
      },
      {
        id: 'rows_columns',
        description: 'Mentions rows/columns or tabular cells.',
        marks: 1,
        acceptable: ['rows and columns', 'tabular format', 'cells in rows and columns'],
      },
    ],
  },
  {
    qid: '2aii',
    answerType: 'list_n',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'db_program', acceptable: ['computer program', 'software'], marks: 1 },
      { id: 'structured_data', acceptable: ['structured data', 'organised data'], marks: 1 },
      { id: 'records_fields', acceptable: ['fields', 'records', 'files', 'tables'], marks: 1, strictness: 'technical' },
    ],
  },
  {
    qid: '2aiii',
    answerType: 'short_text',
    maxMarks: 2,
    components: [
      { id: 'small_program', description: 'Small program.', marks: 1, acceptable: ['small computer program'] },
      {
        id: 'runs_inside_app',
        description: 'Runs inside larger application / performs specific task.',
        marks: 1,
        acceptable: ['within a larger application', 'specific task within an application'],
      },
    ],
  },
  {
    qid: '2b',
    answerType: 'list_n',
    maxMarks: 3,
    selectCount: 3,
    points: [
      { id: 'compiler', acceptable: ['compiler', 'compilers'], marks: 1, strictness: 'technical' },
      { id: 'linker', acceptable: ['linker', 'linkers'], marks: 1, strictness: 'technical' },
      { id: 'device_driver', acceptable: ['device driver', 'device drivers'], marks: 1, strictness: 'technical' },
      { id: 'operating_system', acceptable: ['operating system', 'os'], marks: 1, strictness: 'acronym' },
      { id: 'utility', acceptable: ['utility', 'utility software'], marks: 1 },
    ],
  },
  {
    qid: '3a',
    answerType: 'list_n',
    maxMarks: 4,
    selectCount: 4,
    points: [
      { id: 'interactive_ui', acceptable: ['interactive user interface'], marks: 1 },
      { id: 'asks_questions', acceptable: ['questions are asked'], marks: 1 },
      { id: 'user_answers', acceptable: ['user answers questions', 'yes or no answers'], marks: 1 },
      { id: 'inference_engine', acceptable: ['inference engine searches'], marks: 1, strictness: 'technical' },
      { id: 'knowledge_base', acceptable: ['knowledge base', 'rules base'], marks: 1, strictness: 'technical' },
      { id: 'outputs_explanation', acceptable: ['outputs diagnosis', 'explanation of diagnosis'], marks: 1 },
    ],
  },
  {
    qid: '3b',
    answerType: 'list_n',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'new_illness', acceptable: ['illness could be new'], marks: 1 },
      { id: 'not_in_kb', acceptable: ['not stored in the knowledge base'], marks: 1 },
      { id: 'kb_incorrect', acceptable: ['knowledge base could be incorrect'], marks: 1 },
      { id: 'incorrect_input', acceptable: ['user enters incorrect data'], marks: 1 },
    ],
  },
  {
    qid: '4a',
    answerType: 'list_n',
    maxMarks: 1,
    selectCount: 1,
    points: [
      { id: 'currently_in_use', acceptable: ['data currently in use'], marks: 1 },
      { id: 'old_system_data', acceptable: ['data used in old system'], marks: 1 },
      { id: 'known_output', acceptable: ['outputs are known'], marks: 1 },
    ],
  },
  {
    qid: '4b',
    answerType: 'list_n',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'personal_data', acceptable: ['contains personal data'], marks: 1 },
      { id: 'permission', acceptable: ['permission to use data'], marks: 1 },
      { id: 'breach_law', acceptable: ['breach data protection', 'data protection legislation'], marks: 1 },
    ],
  },
  {
    qid: '4c',
    answerType: 'list_n',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'describes_testing_approach', acceptable: ['describes testing approach'], marks: 1 },
      { id: 'plans_how_tested', acceptable: ['plans how testing will be carried out'], marks: 1 },
      { id: 'each_module_full_system', acceptable: ['each module to be tested', 'full system to be tested'], marks: 1 },
    ],
  },
  {
    qid: '5b',
    answerType: 'list_n',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'scrambling', acceptable: ['scrambling data', 'convert plain text into cipher text'], marks: 1 },
      { id: 'key_encrypt_decrypt', acceptable: ['uses a key to encrypt', 'uses a key to decrypt'], marks: 1 },
      { id: 'hard_to_understand', acceptable: ['data hard to understand', 'unreadable'], marks: 1 },
    ],
  },
  {
    qid: '5c',
    answerType: 'list_n',
    maxMarks: 3,
    selectCount: 3,
    points: [
      { id: 'install_antivirus', acceptable: ['install anti-virus software', 'antivirus installed'], marks: 1 },
      { id: 'update_antivirus', acceptable: ['keep anti-virus up to date'], marks: 1 },
      { id: 'scan_attachment', acceptable: ['scan attachment for viruses'], marks: 1 },
      { id: 'remove_personal_data', acceptable: ['remove personal data from document'], marks: 1 },
      { id: 'encrypt_or_password', acceptable: ['encrypt file', 'password protect file'], marks: 1 },
      { id: 'check_email_address', acceptable: ['send to correct email address'], marks: 1 },
      { id: 'check_attachment', acceptable: ['send correct attachment'], marks: 1 },
    ],
  },
  {
    qid: '8a',
    answerType: 'list_n',
    maxMarks: 1,
    selectCount: 1,
    points: [
      { id: 'cd_reader', acceptable: ['cd reader'], marks: 1 },
      { id: 'dvd_reader', acceptable: ['dvd reader'], marks: 1 },
      { id: 'bluray_reader', acceptable: ['blu-ray disc reader', 'bluray disc reader'], marks: 1 },
    ],
  },
  {
    qid: '8b',
    answerType: 'list_n',
    maxMarks: 1,
    selectCount: 1,
    points: [
      { id: 'hard_drive', acceptable: ['magnetic hard drive', 'hard disk drive', 'hdd'], marks: 1, strictness: 'technical' },
      { id: 'tape_reader', acceptable: ['magnetic tape reader'], marks: 1 },
      { id: 'stripe_reader', acceptable: ['magnetic stripe reader'], marks: 1 },
    ],
  },
  {
    qid: '6',
    answerType: 'long_response',
    maxMarks: 4,
    selectCount: 2,
    points: [
      { id: 'access_anywhere', acceptable: ['access files from anywhere', 'access from any location'], marks: 2 },
      { id: 'automatic_backup', acceptable: ['automatic backup', 'files backed up automatically'], marks: 2 },
      { id: 'collaboration', acceptable: ['easy collaboration', 'share files easily'], marks: 2 },
      { id: 'no_physical_storage', acceptable: ['no need for physical storage', 'saves physical space'], marks: 2 },
    ],
  },
  {
    qid: '7',
    answerType: 'long_response',
    maxMarks: 4,
    selectCount: 2,
    points: [
      { id: 'internet_required', acceptable: ['requires internet connection', 'need internet access'], marks: 2 },
      { id: 'security_concerns', acceptable: ['security concerns', 'data could be hacked'], marks: 2 },
      { id: 'subscription_cost', acceptable: ['subscription costs', 'monthly fees'], marks: 2 },
      { id: 'limited_control', acceptable: ['limited control over data', 'depends on provider'], marks: 2 },
    ],
  },
  {
    qid: '8c',
    answerType: 'list_n',
    maxMarks: 1,
    selectCount: 1,
    points: [
      { id: 'ssd', acceptable: ['ssd', 'solid state drive'], marks: 1, strictness: 'acronym' },
      { id: 'pen_drive', acceptable: ['pen drive', 'usb flash drive'], marks: 1 },
      { id: 'memory_card_reader', acceptable: ['memory card reader'], marks: 1 },
    ],
  },
  {
    qid: '9',
    answerType: 'short_text',
    maxMarks: 2,
    components: [
      { id: 'network_definition', description: 'Network of computers', marks: 1, acceptable: ['network of computers', 'connected computers'] },
      { id: 'limited_area', description: 'Limited geographical area', marks: 1, acceptable: ['limited area', 'small geographical area', 'single building'] },
    ],
  },
  {
    qid: '10',
    answerType: 'list_n',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'share_resources', acceptable: ['share resources', 'share printers', 'share files'], marks: 1 },
      { id: 'central_backup', acceptable: ['central backup', 'centralized data storage'], marks: 1 },
      { id: 'communication', acceptable: ['easy communication', 'email between users'], marks: 1 },
      { id: 'cost_effective', acceptable: ['cost effective', 'share expensive equipment'], marks: 1 },
    ],
  },
  {
    qid: '11',
    answerType: 'long_response',
    maxMarks: 4,
    components: [
      { id: 'router_function', description: 'Router connects networks', marks: 2, acceptable: ['router connects different networks', 'router connects to internet'] },
      { id: 'switch_function', description: 'Switch connects devices', marks: 2, acceptable: ['switch connects devices in same network', 'switch connects computers in LAN'] },
    ],
  },
  {
    qid: '12',
    answerType: 'long_response',
    maxMarks: 4,
    selectCount: 2,
    points: [
      { id: 'range_check', acceptable: ['range check', 'checks value within range'], marks: 2 },
      { id: 'type_check', acceptable: ['type check', 'checks correct data type'], marks: 2 },
      { id: 'length_check', acceptable: ['length check', 'checks correct length'], marks: 2 },
      { id: 'format_check', acceptable: ['format check', 'checks correct format'], marks: 2 },
    ],
  },
  {
    qid: '13a',
    answerType: 'list_n',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'open_on_any_platform', acceptable: ['opened on any platform'], marks: 1 },
      { id: 'compatibility', acceptable: ['programs support generic formats', 'interoperability'], marks: 1 },
      { id: 'transfer_between_packages', acceptable: ['transfer files between packages'], marks: 1 },
    ],
  },
  {
    qid: '13b',
    answerType: 'list_n',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'gif', acceptable: ['gif', 'graphics interchange format'], marks: 1, strictness: 'acronym' },
      { id: 'jpeg', acceptable: ['jpeg', 'jpg', 'joint photographic experts group'], marks: 1, strictness: 'acronym' },
      { id: 'png', acceptable: ['png', 'portable network graphics'], marks: 1, strictness: 'acronym' },
      { id: 'svg', acceptable: ['svg', 'scalable vector graphics'], marks: 1, strictness: 'acronym' },
    ],
  },
];

// Made with Bob
