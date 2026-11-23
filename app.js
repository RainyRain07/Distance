'use strict';
const activities = [
  {id:'walk', title:'เดินเล่นกับเพื่อน', date:'วันเสาร์ · 07.30 น.', place:'สวนชุมชน', category:'ออกกำลัง'},
  {id:'dance', title:'รำไทยกับเพื่อน', date:'วันเสาร์ · 09.00 น.', place:'ศูนย์ชุมชน', category:'ออกกำลัง'},
  {id:'taichi', title:'ไทเก๊กในสวน', date:'วันอาทิตย์ · 07.00 น.', place:'สวนชุมชน', category:'ออกกำลัง'},
  {id:'aerobics', title:'เต้นแอโรบิก', date:'วันอาทิตย์ · 16.00 น.', place:'ลานชุมชน', category:'ออกกำลัง'},
  {id:'craft', title:'ทำงานฝีมือด้วยกัน', date:'วันเสาร์ · 10.00 น.', place:'ศูนย์ชุมชน', category:'งานอดิเรก'},
  {id:'tea', title:'จิบชาและพูดคุย', date:'วันอาทิตย์ · 14.00 น.', place:'ห้องกิจกรรมชุมชน', category:'พบเพื่อน'}
];
const defaults = {joined:[], requests:[], messages:[], appointments:[], medicines:null, medicineName:'ยาตัวอย่าง', medicineNote:'หลังอาหารเช้า', healthLDL:'', share:false, trip:'', settings:{meal:'08:00', large:false}};
let state = {...defaults};
try { state = {...defaults, ...JSON.parse(localStorage.getItem('distance-demo') || '{}')}; } catch {}
let mode = 'user';
let page = ['health', 'trip', 'today', 'appointments'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'activities';
let taxiDraft = {pickup:'', place:'', date:'', itemId:'', context:''};
let taxiReady = false;
const grabRideUrl = 'https://grab.onelink.me/2695613898?pid=organic_web&c=organic_web&af_adset=grab_website&af_ad=th&af_channel=transport&af_sub1=book_ride&is_retargeting=true&af_dp=grab%3A%2F%2Fopen%3FscreenType%3DBOOKING&af_force_deeplink=true&af_web_dp=https%3A%2F%2Fwww.grab.com%2Fth%2Fdownload%2F';
let selectedHealthNode = 'ldl';
let healthZoom = 100;
let lineConnected = false;
let activityFilter = 'ทั้งหมด';
let documentType = 'appointment';
let draft = null;
let previewUrl = null;
let timer;
const panel = document.querySelector('#panel');
const nav = document.querySelector('#nav');
const modal = document.querySelector('#modal');
const content = document.querySelector('#modal-content');
const escape = value => String(value).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[x]);
const tabs = {
  user:{today:'กินยา',appointments:'นัดหมอ',activities:'กิจกรรม',trip:'แท็กซี่',health:'สุขภาพ'},
  family:{requests:'ดูแล',appointments:'นัดหมอ',activities:'กิจกรรม',trip:'เดินทาง',health:'สุขภาพ'}
};
const pageDetails = {
  today:['ตั้งเวลากินยา','ดูเวลาในตาราง ฟังวิธีใช้ และบันทึกเมื่อกินยาแล้ว','medication'],
  appointments:['นัดหมายหมอ','ดูวันนัดและเตรียมการเดินทางไปโรงพยาบาล','calendar_month'],
  activities:['เพื่อนและกิจกรรม','เลือกกิจกรรมที่อยากทำ แล้วชวนเพื่อนไปด้วยกัน','group'],
  trip:['เรียกแท็กซี่','ขอรถไปโรงพยาบาลหรือไปทำกิจกรรม','directions_car'],
  health:['ข้อมูลสุขภาพ','ดูผลตรวจและเรื่องที่ควรคุยกับแพทย์','favorite'],
  requests:['จัดการการดูแล','ดูคำขอและช่วยจัดตารางของคุณแม่','home'],
  documents:['เอกสารและแผนดูแล','อ่านใบนัดตัวอย่างและตรวจข้อมูลก่อนบันทึก','description'],
  settings:['ตั้งค่าการดูแล','ปรับเวลาเตือนและขนาดตัวอักษร','settings'],
  messages:['การแจ้งเตือน','ดูข้อความจากกล่อง LINE จำลอง','notifications']
};
function icon(name) {
  return '<span class="icon" aria-hidden="true">' + name + '</span>';
}
function iconTile(name) {
  return '<span class="feature-icon">' + icon(name) + '</span>';
}
function pageLink(key, label) {
  return '<button data-page="' + key + '">' + icon(pageDetails[key][2]) + '<span>' + label + '</span></button>';
}
function save() {
  try { localStorage.setItem('distance-demo', JSON.stringify(state)); } catch {}
}
function announce(text) {
  const status = document.querySelector('#announce');
  status.textContent = text;
  status.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { status.hidden = true; }, 4000);
}
function notify(text) {
  state.messages.unshift(text);
  save();
}
function button(label, action, id = '', css = '') {
  return '<button class="' + css + '" data-action="' + action + '" data-id="' + id + '">' + label + '</button>';
}
function card(title, body) {
  return '<article class="card"><h3>' + title + '</h3>' + body + '</article>';
}
function activityCards() {
  const filters = ['ทั้งหมด', 'ออกกำลัง', 'งานอดิเรก', 'พบเพื่อน', 'ที่เข้าร่วม'];
  const visible = activities.filter(a => activityFilter === 'ทั้งหมด' || activityFilter === a.category ||
    (activityFilter === 'ที่เข้าร่วม' && state.joined.includes(a.id)));
  const cards = visible.map(a => {
    const joined = state.joined.includes(a.id);
    return '<article class="card activity"><img class="photo activity-photo" src="photos/' + a.id + '.webp" alt="" loading="lazy" decoding="async">' +
      '<div class="activity-copy"><span class="tag ' + (joined ? 'done' : '') + '">' + (joined ? 'เข้าร่วมแล้ว' : a.category) +
      '</span><h3>' + a.title + '</h3><p><span class="meta-line">' + icon('calendar_month') + a.date +
      '</span><span class="meta-line">' + icon('location_on') + a.place + '</span></p><div class="actions">' +
      button(joined ? 'ยกเลิกเข้าร่วม' : 'เข้าร่วม', joined ? 'leave' : 'join', a.id, joined ? '' : 'primary') +
      (joined ? button('ขอรถ', 'ride', a.id) : '') + '</div></div></article>';
  }).join('');
  return '<section class="feature-card"><img class="photo feature-photo" src="photos/tea.webp" alt="" fetchpriority="high"><div><h2>ชวนกันออกไปเจอเพื่อน</h2>' +
    '<p>เลือกกิจกรรมใกล้บ้านและนัดเวลาไปด้วยกัน</p><span class="tag done">' + activities.length + ' กิจกรรมให้เลือก</span></div></section>' +
    '<div class="section-head"><h2>กิจกรรมใกล้บ้าน</h2><span>' + visible.length + ' รายการ</span></div>' +
    '<div class="filters" role="group" aria-label="ประเภทกิจกรรม">' + filters.map(filter =>
      '<button data-action="filter" data-id="' + filter + '" aria-pressed="' + (filter === activityFilter) + '">' + filter + '</button>').join('') +
    '</div><div class="grid">' + (cards || card('ยังไม่มีกิจกรรมที่เข้าร่วม', '<p>เลือกจากกิจกรรมทั้งหมดเพื่อเริ่มต้น</p>')) + '</div>';
}
const thaiDay = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Bangkok', year:'numeric', month:'2-digit', day:'2-digit'});
const thaiAppointment = new Intl.DateTimeFormat('th-TH', {timeZone:'Asia/Bangkok', dateStyle:'long', timeStyle:'short'});
function dateLabel(startsAt) {
  return thaiAppointment.format(new Date(startsAt + '+07:00')) + ' น.';
}
function medicineEntries() {
  return state.medicines ?? [{
    id:'daily', name:state.medicineName, note:state.medicineNote, time:state.settings.meal,
    sample:state.medicineName === 'ยาตัวอย่าง', takenOn:''
  }];
}
function careFeature(image, heading, summary, controls) {
  return '<section class="card care-feature"><div><h2>' + heading + '</h2>' + summary +
    '<div class="actions">' + controls + '</div></div><img src="photos/' + image +
    '.webp" alt="" class="care-photo" decoding="async"></section>';
}
function today() {
  const day = thaiDay.format();
  const schedule = [...medicineEntries()].sort((a,b) => a.time.localeCompare(b.time));
  const taken = schedule.filter(item => item.takenOn === day);
  const next = schedule.find(item => item.takenOn !== day);
  const entries = schedule.map(item => {
    const done = item.takenOn === day;
    return '<article class="card care-entry"><div class="care-time">' + icon('medication') +
      '<strong>' + escape(item.time) + ' น.</strong></div><div class="care-entry-body"><div class="care-entry-title">' +
      '<h3>' + escape(item.name) + '</h3><span class="tag ' + (done ? 'done' : '') + '">' +
      (done ? 'บันทึกแล้ววันนี้' : 'ยังไม่ได้บันทึก') + '</span></div><p>' + escape(item.note) + '</p>' +
      (item.sample ? '<p class="meta">รายการตัวอย่างสำหรับทดลองใช้งาน</p>' : '') +
      '<div class="actions">' + (mode === 'user' ? button(done ? 'ยกเลิกบันทึกวันนี้' : 'กินแล้ว', 'medicine', item.id, done ? '' : 'primary') : '') +
      button('ฟังวิธีใช้', 'speak', item.id) + button('แก้ไข', 'editMedicine', item.id) + '</div></div></article>';
  }).join('');
  return '<div class="stack">' + careFeature('medicine', 'ตารางยาวันนี้',
    '<p class="care-key">' + (next ? 'รายการที่ยังไม่บันทึก · ' + escape(next.time) + ' น.' : 'บันทึกครบแล้ววันนี้') +
    '</p><p class="meta">บันทึกแล้ว ' + taken.length + ' จาก ' + schedule.length + ' รายการ · ภาพประกอบ</p>',
    button('เพิ่มรายการยา', 'newMedicine', '', 'primary') + button('ใช้ใบสั่งยาตัวอย่าง', 'sampleMedicine')) +
    '<div class="section-head"><h2>รายการยา</h2></div>' + entries + '</div>';
}
function appointments() {
  const now = Date.now();
  const ordered = [...state.appointments].sort((a,b) => (a.startsAt || '9999').localeCompare(b.startsAt || '9999'));
  const next = ordered.find(a => a.startsAt && Date.parse(a.startsAt + '+07:00') >= now);
  const entries = ordered.map(a => {
    const past = a.startsAt && Date.parse(a.startsAt + '+07:00') < now;
    return '<article class="card care-entry"><div class="care-time">' + icon('stethoscope') +
      (a.startsAt ? '<strong>' + escape(a.startsAt.slice(11)) + ' น.</strong>' : '') +
      '</div><div class="care-entry-body"><div class="care-entry-title"><h3>' + escape(a.place) + '</h3>' +
      (past ? '<span class="tag">ผ่านวันนัดแล้ว</span>' : '') + '</div><p>' +
      escape(a.startsAt ? dateLabel(a.startsAt) : a.date) + '</p>' +
      (a.department ? '<p class="meta">แผนก ' + escape(a.department) + '</p>' : '') +
      (a.prep ? '<p class="care-prep"><strong>เตรียมไปด้วย</strong> ' + escape(a.prep) + '</p>' : '') +
      (a.taxiTime ? '<p class="meta">เวลานัดรับที่ต้องการ ' + escape(dateLabel(a.taxiTime)) + '</p>' : '') +
      '<div class="actions">' + button('วางแผนแท็กซี่', 'ride', a.id, past ? '' : 'primary') +
      (a.startsAt ? button('เพิ่มลงปฏิทิน', 'calendar', a.id) : '') +
      button('แก้ไขนัด', 'editAppointment', a.id) + '</div></div></article>';
  }).join('');
  return '<div class="stack">' + careFeature('clinic', 'นัดครั้งถัดไป',
    next ? '<p class="care-key">' + escape(next.place) + '</p><p>' + escape(dateLabel(next.startsAt)) + '</p>' :
      '<p class="care-key">ยังไม่มีนัดที่กำลังจะถึง</p><p class="meta">เพิ่มนัดเพื่อดูวัน เวลา และสิ่งที่ต้องเตรียม</p>',
    button('เพิ่มนัด', 'newAppointment', '', 'primary') + button('ใช้ใบนัดตัวอย่าง', 'sample')) +
    '<details class="card"><summary>แนบรูปใบนัด</summary><label class="field">เลือกรูปเพื่อดูคู่กับช่องกรอก<input class="file" type="file" id="doc-photo" accept="image/*"></label></details>' +
    '<div class="section-head"><h2>รายการนัดหมาย</h2></div>' +
    (entries || card('ยังไม่มีนัดที่บันทึก', '<p>เพิ่มนัดจากใบนัดจริง หรือใช้ข้อมูลตัวอย่างเพื่อทดลอง</p>')) + '</div>';
}
function health() {
  const isSample = !state.healthLDL;
  const value = escape(state.healthLDL || '165');
  const heartSource = ['CDC · การป้องกันโรคหัวใจ', 'https://www.cdc.gov/heart-disease/prevention/index.html'];
  const nodes = [
    {id:'root', title:'ผลตรวจเลือด', caption:isSample ? 'ข้อมูลตัวอย่าง' : 'ข้อมูลที่บันทึกไว้',
      detail:'นำผลตรวจไปคุยกับแพทย์เพื่อดูว่าค่าไหนควรติดตามและควรตรวจซ้ำเมื่อไร',
      steps:[
        'เก็บผลตรวจและรายการยาที่ใช้อยู่ไว้ด้วยกัน เพื่อให้แพทย์เปรียบเทียบกับครั้งก่อน',
        'ถามว่าเป้าหมายไขมันและความดันที่เหมาะกับคุณคือเท่าไร และควรนัดติดตามเมื่อไร'
      ],
      source:heartSource},
    {id:'ldl', title:'ไขมัน LDL', caption:value + ' mg/dL',
      detail:'เป้าหมาย LDL ขึ้นอยู่กับประวัติสุขภาพและความเสี่ยงของแต่ละคน',
      steps:[
        ['ลด', 'ลดเนื้อติดมันและอาหารที่มีไขมันอิ่มตัวสูง'],
        ['อาหาร', 'เลือกปลา เนื้อไม่ติดมัน หรือถั่วแทนในบางมื้อ'],
        ['อาหาร', 'เพิ่มอาหารที่มีกากใย เช่น ข้าวโอ๊ต ถั่วเมล็ดแห้ง ผัก และผลไม้'],
        'ถามแพทย์เรื่องเป้าหมาย LDL และการติดตามผล หากได้รับยาลดไขมัน ให้ใช้ตามที่สั่ง'
      ],
      source:['CDC · ไขมันในเลือด', 'https://www.cdc.gov/cholesterol/prevention/index.html']},
    {id:'artery', title:'หลอดเลือดแดงแข็ง', caption:'ภาวะแทรกซ้อนที่เกี่ยวข้อง',
      detail:'LDL ที่สูงต่อเนื่องสัมพันธ์กับการสะสมของไขมันในผนังหลอดเลือด',
      steps:[
        ['ลด', 'หากสูบบุหรี่ ขอให้ทีมรักษาช่วยวางแผนเลิกบุหรี่'],
        'ขยับร่างกายสม่ำเสมอตามกำลัง เช่น เดินช่วงสั้น ๆ แล้วค่อยเพิ่มตามที่ร่างกายไหว หากมีข้อจำกัดให้ถามทีมรักษาก่อน',
        'ติดตามความดัน น้ำตาล และไขมันตามแผนที่ตกลงกับแพทย์'
      ],
      source:['NHLBI · การป้องกันหลอดเลือดแดงแข็ง', 'https://www.nhlbi.nih.gov/health/atherosclerosis/prevention']},
    {id:'heart', title:'โรคหัวใจขาดเลือด', caption:'โรครุนแรงที่เกี่ยวข้อง',
      detail:'หลอดเลือดหัวใจตีบอาจทำให้เลือดไปเลี้ยงหัวใจลดลง ความดันสูง เบาหวาน และไขมันสูงเป็นปัจจัยที่ควรดูร่วมกัน',
      steps:[
        'วัดความดันตามที่ทีมรักษาแนะนำ หากมีเบาหวาน ให้ติดตามระดับน้ำตาลตามแผนรักษา',
        ['ลด', 'ลดอาหารเค็ม เช่น อาหารสำเร็จรูป และชิมก่อนเติมน้ำปลา'],
        ['อาหาร', 'เลือกปลา เนื้อไม่ติดมัน หรืออาหารที่มีกากใย เช่น ผักและถั่ว'],
        'กินยาที่แพทย์สั่งตามแผน และคุยกับแพทย์หรือเภสัชกรก่อนเปลี่ยนหรือหยุดยา'
      ],
      source:heartSource},
    {id:'brain', title:'หลอดเลือดสมองขาดเลือด', caption:'โรครุนแรงที่เกี่ยวข้อง',
      detail:'หลอดเลือดที่ไปเลี้ยงสมองตีบหรืออุดตันอาจทำให้เกิดโรคหลอดเลือดสมอง',
      steps:[
        ['ลด', 'ลดอาหารเค็มเพื่อช่วยควบคุมความดัน และติดตามความดันตามแผนรักษา'],
        ['อาหาร', 'เลือกผัก ผลไม้ และธัญพืชไม่ขัดสีให้บ่อยขึ้น'],
        'ถ้ามีเบาหวาน ไขมันสูง หรือหัวใจเต้นผิดจังหวะ ให้ติดตามการรักษาตามนัด',
        'หากสูบบุหรี่ ขอความช่วยเหลือเพื่อเลิก และทำกิจกรรมทางกายที่เหมาะกับกำลัง'
      ],
      source:['CDC · การป้องกันโรคหลอดเลือดสมอง', 'https://www.cdc.gov/stroke/prevention/index.html']}
  ];
  const active = nodes.find(node => node.id === selectedHealthNode);
  const steps = nodes.map(node =>
    '<button class="tree-node tree-' + node.id + '" data-action="healthNode" data-id="' + node.id +
    '" aria-pressed="' + (node === active) + '" aria-controls="health-detail"><strong>' + node.title +
    '</strong><span>' + node.caption + '</span></button>').join('');
  return '<div class="stack"><section class="card tree-card" aria-labelledby="tree-title"><div class="tree-toolbar">' +
    '<div><h2 id="tree-title">แผนผังสุขภาพ</h2><p class="meta">เลือกกิ่งเพื่อดูรายละเอียด</p></div>' +
    '<div class="tree-controls" role="group" aria-label="ขนาดแผนผัง">' +
    '<button data-action="healthZoom" data-id="out" aria-label="ซูมออก"' + (healthZoom === 75 ? ' disabled' : '') + '>−</button>' +
    '<output aria-live="polite">' + healthZoom + '%</output>' +
    '<button data-action="healthZoom" data-id="in" aria-label="ซูมเข้า"' + (healthZoom === 175 ? ' disabled' : '') + '>+</button>' +
    '<button data-action="healthZoom" data-id="fit">พอดีจอ</button></div></div>' +
    '<div class="tree-scroll" tabindex="0" aria-label="พื้นที่แผนผังสุขภาพ"><div class="tree-stage" style="width:' + healthZoom +
    '%;--tree-zoom:' + healthZoom / 100 + '"><svg class="tree-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
    '<path d="M50 89 V38 M50 38 C50 25 24 33 24 13 M50 38 C50 25 76 33 76 13"/></svg>' +
    steps + '</div></div><div class="tree-legend" aria-label="ความหมายของสี">' +
    '<span class="health-label complication">ภาวะแทรกซ้อน</span><span class="health-label severe">โรครุนแรง</span></div>' +
    '<div class="tree-detail" id="health-detail" aria-live="polite">' + iconTile('favorite') +
    '<div><h3>' + active.title + '</h3><p>' + active.detail + '</p>' +
    '<div class="prevention"><h4>ทำอะไรได้บ้างเพื่อลดความเสี่ยง</h4><ul>' +
    active.steps.map(step => {
      if (typeof step === 'string') return '<li>' + step + '</li>';
      const [type, description] = step;
      const label = type === 'ลด' ? '<span class="health-label reduce">สิ่งที่ควรลด</span>' :
        '<span class="health-label food">อาหารที่ควรกิน</span>';
      return '<li>' + label + ' ' + description + '</li>';
    }).join('') +
    '</ul><a href="' + active.source[1] + '" target="_blank" rel="noopener noreferrer">' +
    active.source[0] + '</a></div></div></div></section>' +
    card('ผลตรวจเลือด', '<p class="meta">' + (isSample ? 'แสดงข้อมูลตัวอย่าง' : 'แสดงข้อมูลที่บันทึกไว้') +
      ' · กิ่งความเสี่ยงใช้ประกอบการพูดคุยกับแพทย์</p><div class="actions">' +
      button('อ่านผลตรวจตัวอย่าง','sampleHealth','', 'primary') + button('แก้ไขผลตรวจ','editHealth') + '</div>') + '</div>';
}
function taxiReview() {
  const maps = new URL('https://www.google.com/maps/dir/');
  maps.search = new URLSearchParams({api:'1', origin:taxiDraft.pickup, destination:taxiDraft.place, travelmode:'driving'});
  const when = taxiDraft.date ? taxiDraft.date.replace('T', ' · ') + ' น.' : 'เดินทางตอนนี้';
  const tripText = 'จุดรับ: ' + taxiDraft.pickup + '\nจุดส่ง: ' + taxiDraft.place + '\nเวลา: ' + when;
  return '<section class="card taxi-review" id="taxi-review" aria-labelledby="taxi-review-title">' +
    '<h2 id="taxi-review-title" tabindex="-1">ตรวจรายละเอียดก่อนจอง</h2>' +
    '<dl class="taxi-summary"><div><dt>จุดรับ</dt><dd>' + escape(taxiDraft.pickup) + '</dd></div><div><dt>จุดส่ง</dt><dd>' +
    escape(taxiDraft.place) + '</dd></div><div><dt>เวลาที่ต้องการ</dt><dd>' + escape(when) + '</dd></div></dl>' +
    '<p class="meta">ใส่จุดรับ จุดส่ง และเวลาใน Grab แล้วเลือก GrabTaxi หากมีให้บริการ ตรวจราคาและกดยืนยันใน Grab</p>' +
    '<div class="actions taxi-actions"><a class="taxi-link taxi-grab" href="' + escape(grabRideUrl) +
    '" target="_blank" rel="noopener noreferrer">' + icon('directions_car') + 'จองต่อใน Grab</a>' +
    '<a class="taxi-link" href="' + escape(maps.href) + '" target="_blank" rel="noopener noreferrer">' +
    icon('location_on') + 'ดูเส้นทางใน Google Maps</a></div>' +
    '<details class="taxi-copy"><summary>ดูรายละเอียดสำหรับคัดลอก</summary><textarea rows="3" readonly aria-label="รายละเอียดการเดินทาง">' +
    escape(tripText) + '</textarea>' + button('คัดลอกจุดรับ จุดส่ง และเวลา', 'copyTaxi') + '</details>' +
    button('บันทึกคำขอให้ครอบครัวช่วย (เดโม)', 'taxiFamily') + '</section>';
}
function trip() {
  return '<div class="stack"><div class="taxi-layout">' +
    '<section class="card taxi-booking"><div class="title-row">' + iconTile('directions_car') +
    '<div><h2>วางแผนเรียกแท็กซี่</h2><p class="meta">เตรียมจุดรับและจุดส่ง ก่อนเปิดแอป Grab</p></div></div>' +
    (taxiDraft.context ? '<p class="meta">นัดที่เกี่ยวข้อง · ' + escape(taxiDraft.context) + '</p>' : '') +
    '<form id="taxi-form"><div class="taxi-stops"><label class="field">' + icon('home') +
    '<span>จุดรับ</span><input name="pickup" maxlength="120" placeholder="เช่น บ้าน หรือชื่ออาคาร" required value="' + escape(taxiDraft.pickup) +
    '"></label><label class="field">' + icon('location_on') + '<span>จุดส่ง</span><input name="place" maxlength="120" placeholder="เช่น ชื่อโรงพยาบาลและสาขา" required value="' +
    escape(taxiDraft.place) + '"></label></div><label class="field">เวลานัดรับ <span class="meta">เว้นว่างเมื่อต้องการเดินทางตอนนี้</span>' +
    '<input name="date" type="datetime-local" value="' + escape(taxiDraft.date) + '"></label>' +
    '<button class="primary" type="submit">ตรวจรายละเอียดการเดินทาง</button></form></section>' +
    (taxiReady ? taxiReview() : '<section class="card taxi-service"><div class="title-row">' + iconTile('directions_car') +
    '<div><h2>GrabTaxi</h2><p class="meta">เช็กราคาและจองในแอป Grab</p></div></div>' +
    '<p>กรอกจุดรับและจุดส่งเพื่อดูเส้นทาง หรือจองล่วงหน้าโดยเลือกวันและเวลาในแอป Grab</p>' +
    '<a class="taxi-link" href="https://www.grab.com/th/transport/taxi/" target="_blank" rel="noopener noreferrer">วิธีเรียก GrabTaxi</a></section>') + '</div>' +
    '<details class="card"><summary>ทดลองแชร์สถานะการเดินทาง (เดโม)</summary><p>' +
    (state.share ? 'เปิดแชร์ในเดโมแล้ว' : 'หยุดแชร์อยู่') + '</p>' + button(state.share ? 'หยุดแชร์' : 'เปิดแชร์', 'share') +
    (state.share ? '<div class="actions">' + ['ออกจากบ้าน','อยู่ระหว่างเดินทาง','ถึงจุดหมาย','กลับถึงบ้าน'].map((label,i) => button(label,'trip',i)).join('') + '</div>' : '') +
    (state.trip ? '<p>สถานะล่าสุด: ' + state.trip + '</p>' : '') + '</details>' +
    state.requests.map(r => card(escape(r.title), '<p>' + escape(r.date) + ' · ' + (r.done ? 'ลูกตอบรับแล้ว' : 'รอลูกตอบรับ') + ' · คำขอในเดโม</p>')).join('') + '</div>';
}
function requests() {
  return '<section class="card highlight"><div class="title-row">' + iconTile('group') +
    '<div><h2>คุณสมใจ</h2><p class="meta">ครอบครัวช่วยจัดตารางและดูคำขอได้ที่นี่</p></div></div></section>' +
    '<div class="section-head"><h2>รายการที่จัดการได้</h2></div><div class="family-links">' +
    pageLink('today','ตารางยา') + pageLink('appointments','นัดหมอ') + pageLink('activities','กิจกรรม') +
    pageLink('trip','การเดินทาง') + pageLink('documents','เอกสารและแผนดูแล') + pageLink('settings','การตั้งค่า') +
    '</div><h2>คำขอจากคุณแม่</h2><div class="stack">' +
    (state.requests.length ? state.requests.map(r => card(escape(r.title), '<p>' + escape(r.date) + '</p><p>ขอให้ช่วยจัดรถ · ' +
      (r.done ? 'ตอบรับแล้ว' : 'รอตอบรับ') + '</p>' + (r.done ? '' : button('ตอบรับว่าจะช่วย', 'accept', r.id, 'primary')))).join('') :
      card('ยังไม่มีคำขอ', '<p>เมื่อคุณแม่ขอให้ช่วยจัดรถ รายการจะขึ้นที่นี่</p>')) +
    (state.share && state.trip ? card('สถานะที่คุณแม่แชร์', '<p>' + state.trip + '</p>') : '') + '</div>';
}
function documents() {
  return '<h2>เอกสารและ Roadmap</h2><div class="stack">' +
    card('ทดลองจัดตารางจากใบนัด', '<p>ใช้ใบนัดสมมติหรือแนบรูปเพื่อดูตัวอย่าง ขั้นตอนอ่านเอกสารใช้ข้อมูลตัวอย่าง</p><div class="actions">' +
      button('ใช้ใบนัดตัวอย่าง', 'sample', '', 'primary') + '</div><label class="field">แนบรูปใบนัด <input class="file" type="file" id="doc-photo" accept="image/*"></label>') +
    card('แผนการดูแล', '<div class="branch"><p><strong>อ่านใบนัด → ตรวจยืนยัน → จัดตาราง</strong></p><ul>' +
      '<li><strong>ยา</strong> · แจ้งเตือนตามฉลากที่ยืนยันแล้ว</li><li><strong>นัดหมอ</strong> · เพิ่มเข้าตารางและขอให้ลูกช่วยจัดรถ</li>' +
      '<li><strong>เพื่อนและกิจกรรม</strong> · เลือกกิจกรรมใกล้บ้านและแชร์นัด</li><li><strong>การเดินทาง</strong> · ส่งสถานะตามที่เจ้าตัวอนุญาต</li></ul></div>') + '</div>';
}
function settings() {
  return '<h2>ตั้งค่าการดูแล</h2><div class="card"><form id="settings-form"><label class="field">เวลาเริ่มต้นเมื่อเพิ่มรายการยา<input name="meal" type="time" value="' +
    escape(state.settings.meal) + '" required></label><label><input name="large" type="checkbox" ' + (state.settings.large ? 'checked' : '') +
    '> ใช้ตัวอักษรขนาดใหญ่</label><p><button class="primary" type="submit">บันทึกการตั้งค่า</button></p></form></div>';
}
document.querySelector('#line-login').addEventListener('click', event => {
  lineConnected = !lineConnected;
  event.currentTarget.textContent = lineConnected ? 'ออกจาก LINE จำลอง' : 'ทดลองเข้าสู่ระบบด้วย LINE';
  event.currentTarget.setAttribute('aria-pressed', String(lineConnected));
  announce(lineConnected ? 'เข้าสู่ระบบด้วย LINE จำลองแล้ว' : 'ออกจาก LINE จำลองแล้ว');
});
document.querySelector('#line-inbox').addEventListener('click', () => { page = 'messages'; render(); });
function messages() {
  return '<h2>กล่องแจ้งเตือน LINE จำลอง</h2><div class="stack">' +
    (state.messages.length ? state.messages.map(x => '<div class="card">' + escape(x) + '</div>').join('') : card('ยังไม่มีข้อความ','<p>เมื่อมีคำขอหรือยืนยันนัด ข้อความตัวอย่างจะขึ้นที่นี่</p>')) + '</div>';
}
const screens = {activities:activityCards,today,appointments,health,trip,requests,documents,settings,messages};
function render() {
  document.documentElement.classList.toggle('large-text', state.settings.large);
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
  document.querySelector('#mode-label').textContent = mode === 'user' ? 'คุณสมใจ · โหมดผู้สูงอายุ' : 'ดูแลคุณสมใจ · โหมดครอบครัว';
  const [title, description] = pageDetails[page];
  document.querySelector('#hero-title').textContent = title;
  document.querySelector('#hero-copy').textContent = description;
  const inbox = document.querySelector('#line-inbox');
  if (page === 'messages') inbox.setAttribute('aria-current', 'page');
  else inbox.removeAttribute('aria-current');
  nav.innerHTML = Object.entries(tabs[mode]).map(([key,label]) =>
    '<button data-page="' + key + '" aria-pressed="' + (key === page) + '">' + icon(pageDetails[key][2]) + '<span>' + label + '</span></button>').join('');
  panel.innerHTML = screens[page]();
}
function openDraft(photo, entry) {
  documentType = 'appointment';
  const isSample = !photo && !entry;
  draft = isSample ? {
    place:'โรงพยาบาลชุมชน (ตัวอย่าง)', startsAt:thaiDay.format(Date.now() + 86400000) + 'T09:00',
    department:'ตรวจสุขภาพ', prep:'บัตรประชาชนและใบนัด'
  } : {...entry};
  if (photo) previewUrl = URL.createObjectURL(photo);
  content.innerHTML = '<h2 id="dialog-title">' + (draft.id ? 'แก้ไขนัดหมอ' : 'เพิ่มนัดหมอ') + '</h2>' +
    (photo ? '<p>กรอกข้อมูลจากใบนัดที่แนบ</p><img class="preview" id="preview-image" alt="ภาพใบนัดที่แนบ">' : '') +
    (isSample ? '<p>ตรวจและแก้ข้อมูลจากใบนัดตัวอย่างได้</p>' : '') +
    '<form id="extract-form"><label class="field">โรงพยาบาลหรือคลินิก<input name="place" maxlength="120" required value="' + escape(draft.place || '') +
    '"></label>' + (draft.date && !draft.startsAt ? '<p class="meta">วันนัดเดิม · ' + escape(draft.date) + '</p>' : '') +
    '<label class="field">วันและเวลานัด (เวลาไทย)<input name="startsAt" type="datetime-local" required value="' +
    escape(draft.startsAt || '') + '"></label><label class="field">แผนก (ไม่บังคับ)<input name="department" maxlength="120" value="' +
    escape(draft.department || '') + '"></label><label class="field">สิ่งที่ต้องเตรียม (ไม่บังคับ)<input name="prep" maxlength="160" value="' +
    escape(draft.prep || '') + '"></label><label class="field">เวลานัดรับแท็กซี่ที่ต้องการ (ไม่บังคับ)<input name="taxiTime" type="datetime-local" value="' +
    escape(draft.taxiTime || '') + '"></label><button class="primary" type="submit">ตรวจรายละเอียด</button></form>';
  if (photo) content.querySelector('#preview-image').src = previewUrl;
  modal.showModal();
}
function openMedicine(entry) {
  documentType = 'medicine';
  draft = {...entry};
  content.innerHTML = '<h2 id="dialog-title">' + (draft.id ? 'แก้ไขรายการยา' : 'เพิ่มรายการยา') + '</h2>' +
    '<p>กรอกตามฉลากยาหรือคำแนะนำจากแพทย์หรือเภสัชกร</p>' +
    '<form id="health-form"><label class="field">ชื่อยาตามฉลาก<input name="name" maxlength="120" required value="' +
    escape(draft.name || '') + '"></label><label class="field">วิธีใช้ตามฉลาก<input name="note" maxlength="160" required value="' +
    escape(draft.note || '') + '"></label><label class="field">เวลากินยาประจำวัน (เวลาไทย)<input name="time" type="time" required value="' +
    escape(draft.time || state.settings.meal) + '"></label><button class="primary" type="submit">ตรวจรายละเอียด</button></form>';
  modal.showModal();
}
function openHealthDocument(sample) {
  documentType = 'health';
  content.innerHTML = '<h2 id="dialog-title">ตรวจผลเลือด</h2>' +
    (sample ? '<p>ขั้นที่ 1 · ข้อมูลที่อ่านจากเอกสารตัวอย่าง</p>' : '') +
    '<form id="health-form"><label class="field">ค่า LDL (mg/dL)<input name="ldl" type="number" min="1" max="999" step="any" required value="' +
    escape(sample ? '165' : state.healthLDL) + '"></label><button class="primary" type="submit">ตรวจแล้ว · ดูร่าง</button></form>';
  modal.showModal();
}
function downloadAppointment(id) {
  const entry = state.appointments.find(item => item.id === id);
  if (!entry?.startsAt) return;
  const calendarDate = date => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const calendarText = value => value.replace(/[\\,;]|\r?\n/g, x => x.includes('\n') ? '\\n' : '\\' + x);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Distance//TH', 'BEGIN:VEVENT',
    'UID:' + calendarText(entry.id) + '@distance',
    'DTSTAMP:' + calendarDate(new Date()),
    'DTSTART:' + calendarDate(new Date(entry.startsAt + '+07:00')),
    'SUMMARY:' + calendarText('นัดหมอ · ' + entry.place),
    'LOCATION:' + calendarText(entry.place),
    'DESCRIPTION:' + calendarText([entry.department, entry.prep].filter(Boolean).join('\n')),
    'END:VEVENT', 'END:VCALENDAR', ''
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], {type:'text/calendar;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'distance-appointment.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('ดาวน์โหลดแล้ว เปิดไฟล์ในแอปปฏิทินเพื่อเพิ่มนัด');
}
function addTaxiRequest(item, id) {
  state.requests.push({id:crypto.randomUUID(), itemId:id, title:item.title || item.place, date:item.date, done:false});
  notify('ถึงครอบครัว · คำขอแท็กซี่ไป ' + (item.title || item.place));
  announce('ส่งคำขอแท็กซี่ในเดโมแล้ว');
}
function ride(id) {
  const item = activities.find(a => a.id === id) || state.appointments.find(a => a.id === id);
  if (!item) return;
  taxiDraft = {...taxiDraft, place:item.place, date:item.taxiTime || '', itemId:id, context:item.date};
  taxiReady = false;
  page = 'trip';
  window.scrollTo(0, 0);
}
const actions = {
  healthNode(id) { selectedHealthNode = id; },
  healthZoom(id) {
    if (id === 'fit') healthZoom = 100;
    else healthZoom += id === 'in' ? 25 : -25;
  },
  filter(id) { activityFilter = id; },
  join(id) {
    const activity = activities.find(item => item.id === id);
    if (!activity || state.joined.includes(id)) return;
    state.joined.push(id);
    notify('ถึงคุณสมใจ · นัดกิจกรรม ' + activity.title + ' · ' + activity.date);
    announce('เพิ่มกิจกรรมในตารางแล้ว');
  },
  leave(id) { state.joined = state.joined.filter(x => x !== id); announce('นำกิจกรรมออกจากตารางแล้ว'); },
  ride,
  copyTaxi() {
    const field = panel.querySelector('.taxi-copy textarea');
    field.focus();
    field.select();
    if (!navigator.clipboard) { announce('เลือกข้อความแล้ว กดคัดลอกได้เลย'); return; }
    navigator.clipboard.writeText(field.value).then(
      () => announce('คัดลอกรายละเอียดการเดินทางแล้ว'),
      () => announce('เลือกข้อความแล้ว กดคัดลอกได้เลย')
    );
  },
  taxiFamily() {
    if (!taxiReady) return;
    if (taxiDraft.itemId && state.requests.some(request => request.itemId === taxiDraft.itemId)) {
      announce('มีคำขอสำหรับนัดนี้แล้ว');
      return;
    }
    addTaxiRequest({place:taxiDraft.place, date:taxiDraft.date.replace('T',' · ') || 'เดินทางตอนนี้'}, taxiDraft.itemId);
  },
  accept(id) {
    const r = state.requests.find(x => x.id === id);
    if (!r || r.done) return;
    r.done = true;
    notify('ถึงคุณสมใจ · ลูกตอบรับว่าจะช่วยจัดรถสำหรับ ' + r.title);
    announce('บันทึกคำตอบแล้ว');
  },
  medicine(id) {
    if (mode !== 'user') return;
    const day = thaiDay.format();
    const items = medicineEntries();
    const item = items.find(entry => entry.id === id);
    if (!item) return;
    const undo = item.takenOn === day;
    state.medicines = items.map(entry => entry.id === id ? {...entry, takenOn:undo ? '' : day} : entry);
    notify('ถึงครอบครัว · ' + (undo ? 'ยกเลิกบันทึกกินยา ' : 'บันทึกว่ากินยาแล้ว ') + item.name);
    announce(undo ? 'ยกเลิกบันทึกวันนี้แล้ว' : 'บันทึกว่ากินยาแล้ววันนี้');
  },
  speak(id) {
    const item = medicineEntries().find(entry => entry.id === id);
    if (!item) return;
    if (!window.speechSynthesis) { announce('เบราว์เซอร์นี้ไม่มีระบบอ่านออกเสียง'); return; }
    const speech = new SpeechSynthesisUtterance(item.name + ' ' + item.note);
    speech.lang = 'th-TH';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  },
  share() { state.share = !state.share; if (!state.share) state.trip = ''; announce(state.share ? 'เปิดแชร์สถานะจำลองแล้ว' : 'หยุดแชร์สถานะแล้ว'); },
  trip(id) {
    if (!state.share) return;
    state.trip = ['ออกจากบ้าน','อยู่ระหว่างเดินทาง','ถึงจุดหมาย','กลับถึงบ้าน'][Number(id)];
    notify('ถึงครอบครัว · สถานะจำลอง: ' + state.trip);
    announce('อัปเดตสถานะแล้ว');
  },
  sample() { openDraft(); },
  newAppointment() { openDraft(null, {place:'', date:''}); },
  editAppointment(id) {
    const entry = state.appointments.find(a => a.id === id);
    if (entry) openDraft(null, entry);
  },
  sampleHealth() { openHealthDocument(true); },
  editHealth() { openHealthDocument(false); },
  calendar:downloadAppointment,
  newMedicine() { openMedicine({}); },
  sampleMedicine() {
    const sample = medicineEntries().find(item => item.sample);
    openMedicine({id:sample?.id || 'sample-rx', name:'ยาตัวอย่างจากใบสั่ง', note:'หลังอาหารเช้า', time:'08:00', sample:true});
  },
  editMedicine(id) {
    const entry = medicineEntries().find(item => item.id === id);
    if (entry) openMedicine(entry);
  },
  confirm() {
    if (!draft) return;
    if (documentType === 'medicine') {
      const entry = {...draft, sample:draft.sample && draft.name.startsWith('ยาตัวอย่าง'), id:draft.id || crypto.randomUUID()};
      state.medicines = [...medicineEntries().filter(item => item.id !== entry.id && (entry.sample || !item.sample)), entry];
      notify('ถึงคุณสมใจ · บันทึกเวลา ' + entry.name + ' ' + entry.time + ' น.');
    } else if (documentType === 'health') {
      state.healthLDL = draft.ldl;
      notify('ถึงคุณสมใจ · บันทึกผลตรวจแล้ว');
    } else {
      const entry = {...draft, id:draft.id || crypto.randomUUID()};
      state.appointments = [...state.appointments.filter(a => a.id !== entry.id), entry];
      notify('ถึงคุณสมใจ · อัปเดตนัด ' + entry.place + ' · ' + entry.date);
      if (entry.taxiTime) notify('ถึงคุณสมใจ · บันทึกเวลานัดรับที่ต้องการ ' + dateLabel(entry.taxiTime));
    }
    modal.close();
    announce('บันทึกข้อมูลแล้ว');
  }
};
document.addEventListener('click', event => {
  const b = event.target.closest('button');
  if (!b) return;
  if (b.dataset.mode) {
    mode = b.dataset.mode;
    page = mode === 'user' ? 'activities' : 'requests';
    activityFilter = 'ทั้งหมด';
    render();
  } else if (b.dataset.page) {
    page = b.dataset.page;
    render();
    const current = nav.querySelector('[aria-pressed=true]');
    if (current) current.focus({preventScroll:true});
    window.scrollTo(0, 0);
  } else if (b.dataset.action && Object.hasOwn(actions,b.dataset.action)) {
    const {action, id} = b.dataset;
    const tree = panel.querySelector('.tree-scroll');
    const scrollRatio = tree?.scrollWidth ? (tree.scrollLeft + tree.clientWidth / 2) / tree.scrollWidth : .5;
    actions[action](id);
    if (action === 'copyTaxi') return;
    save();
    render();
    if (action === 'healthNode' || action === 'healthZoom') {
      const nextTree = panel.querySelector('.tree-scroll');
      if (id !== 'fit') nextTree.scrollLeft = nextTree.scrollWidth * scrollRatio - nextTree.clientWidth / 2;
      const control = panel.querySelector('[data-action="' + action + '"][data-id="' + id + '"]');
      (control.disabled ? panel.querySelector('[data-id="fit"]') : control).focus({preventScroll:true});
    }
    if (action === 'share' || action === 'trip') {
      const sharing = panel.querySelector('details.card');
      if (sharing) sharing.open = true;
    }
    if (action === 'filter') panel.querySelector('.filters [aria-pressed="true"]').focus();
  }
});
document.addEventListener('change', event => {
  if (event.target.id === 'doc-photo' && event.target.files[0]) openDraft(event.target.files[0]);
});
document.addEventListener('input', event => {
  if (event.target.form?.id !== 'taxi-form' || !taxiReady) return;
  taxiReady = false;
  panel.querySelector('#taxi-review').hidden = true;
});
document.addEventListener('submit', event => {
  if (!['extract-form','settings-form','health-form','taxi-form'].includes(event.target.id)) return;
  event.preventDefault();
  const fields = new FormData(event.target);
  if (event.target.id === 'taxi-form') {
    const pickup = fields.get('pickup').trim();
    const place = fields.get('place').trim();
    if (!pickup || !place) { announce('กรุณาระบุจุดรับและจุดส่ง'); return; }
    taxiDraft = {...taxiDraft, pickup, place, date:fields.get('date')};
    taxiReady = true;
    render();
    panel.querySelector('#taxi-review-title').focus();
  } else if (event.target.id === 'health-form') {
    const values = Object.fromEntries(fields);
    if (documentType === 'medicine') {
      values.name = values.name.trim();
      values.note = values.note.trim();
      if (!values.name || !values.note) { announce('กรุณาระบุชื่อยาและวิธีใช้ตามฉลาก'); return; }
    }
    draft = documentType === 'medicine' ? {...draft, ...values} : values;
    const details = documentType === 'medicine' ? draft.name + ' · ' + draft.note + ' · ' + draft.time : 'LDL ' + draft.ldl + ' mg/dL';
    content.innerHTML = '<h2 id="dialog-title">ร่างข้อมูล</h2><p>ขั้นที่ 2 · ตรวจรายการก่อนบันทึก</p><p>' +
      escape(details) + '</p>' + button('ยืนยันและบันทึก', 'confirm', '', 'primary');
    content.querySelector('button').focus();
  } else if (event.target.id === 'extract-form') {
    const fieldsByName = Object.fromEntries(fields);
    const {startsAt, taxiTime} = fieldsByName;
    const place = fieldsByName.place.trim();
    if (!place || !startsAt) { announce('กรุณาระบุสถานที่และเวลานัด'); return; }
    if (taxiTime && taxiTime >= startsAt) { announce('เวลานัดรับแท็กซี่ควรอยู่ก่อนเวลานัดหมอ'); return; }
    draft = {...draft, ...fieldsByName, place, date:dateLabel(startsAt)};
    content.innerHTML = '<h2 id="dialog-title">ร่างตารางดูแล</h2><p>ขั้นที่ 2 · จัดตารางจากข้อมูลที่ตรวจแล้ว</p><p><strong>' +
      escape(draft.place) + '</strong><br>' + escape(draft.date) + '</p>' +
      (draft.taxiTime ? '<p>บันทึกเวลานัดรับที่ต้องการ ' + escape(dateLabel(draft.taxiTime)) + '</p>' : '') +
      '<p>เพิ่มในตารางของคุณสมใจและส่งข้อความเข้า LINE จำลอง</p>' +
      button('ยืนยันนัด', 'confirm', '', 'primary');
    content.querySelector('button').focus();
  } else {
    state.settings = {meal:fields.get('meal'),large:fields.has('large')};
    save();
    render();
    announce('บันทึกการตั้งค่าแล้ว');
  }
});
modal.addEventListener('close', () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  draft = null;
  const input = document.querySelector('#doc-photo');
  if (input) input.value = '';
});
window.addEventListener('storage', event => {
  if (event.key !== 'distance-demo') return;
  try { state = {...defaults, ...JSON.parse(event.newValue || '{}')}; render(); } catch {}
});
render();
