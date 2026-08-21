
> <script>
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MEDITRUST API CLIENT
  // Central place for every call to the real backend. Replaces the old
  // localStorage-based getCases()/saveCases()/updateCase() functions.
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const API_BASE = 'http://localhost:5000/api';
  
  function getAccessToken() { return localStorage.getItem('mt_accessToken'); }
  function getRefreshToken() { return localStorage.getItem('mt_refreshToken'); }
  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('mt_user') || 'null'); }
    catch { return null; }
  }
  function setSession(user, accessToken, refreshToken) {
    localStorage.setItem('mt_user', JSON.stringify(user));
    localStorage.setItem('mt_accessToken', accessToken);
    localStorage.setItem('mt_refreshToken', refreshToken);
  }
  function clearSession() {
    localStorage.removeItem('mt_user');
    localStorage.removeItem('mt_accessToken');
    localStorage.removeItem('mt_refreshToken');
  }
  
  async function apiRequest(path, { method = 'GET', body, isFormData = false } = {}) {
    const headers = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';
  
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  
    let data;
    try { data = await response.json(); }
    catch { data = { success: false, message: 'Unexpected server response' }; }
  
    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }
    return data.data;
  }
  
  const api = {
    login: (email, password, role) =>
      apiRequest('/auth/login', { method: 'POST', body: { email, password, role } }),
    register: (payload) =>
      apiRequest('/auth/register', { method: 'POST', body: payload }),
    me: () => apiRequest('/auth/me'),
  
    getAvailableDoctors: () => apiRequest('/patients/doctors'),
    createCase: () => apiRequest('/patients/cases', { method: 'POST' }),
    updateCase: (id, payload) =>
      apiRequest(`/patients/cases/${id}`, { method: 'PUT', body: payload }),
    uploadDocuments: (id, formData) =>
      apiRequest(`/patients/cases/${id}/upload`, { method: 'POST', body: formData, isFormData: true }),
    selectDoctors: (id, doctorIds) =>
      apiRequest(`/patients/cases/${id}/select-doctors`, { method: 'POST', body: { doctorIds } }),
    createPaymentOrder: (id) =>
      apiRequest(`/patients/cases/${id}/payment/order`, { method: 'POST' }),
    verifyPayment: (id, payload) =>
      apiRequest(`/patients/cases/${id}/payment/verify`, { method: 'POST', body: payload }),
    getMyCases: () => apiRequest('/patients/cases'),
    getCaseById: (id) => apiRequest(`/patients/cases/${id}`),
    getCaseReport: (id) => apiRequest(`/patients/cases/${id}/report`),
  
    getAssignedCases: () => apiRequest('/doctors/cases'),
    getDoctorCaseHistory: () => apiRequest('/doctors/cases/history'),
    getCaseForReview: (id) => apiRequest(`/doctors/cases/${id}`),
    submitReview: (id, payload) =>
      apiRequest(`/doctors/cases/${id}/review`, { method: 'POST', body: payload }),
  
    getConflictCases: () => apiRequest('/chief-doctor/cases'),
    getChiefCaseHistory: () => apiRequest('/chief-doctor/cases/history'),
    getCaseForFinalReview: (id) => apiRequest(`/chief-doctor/cases/${id}`),
    submitFinalReview: (id, payload) =>
      apiRequest(`/chief-doctor/cases/${id}/final-review`, { method: 'POST', body: payload }),
  
    getAnalytics: () => apiRequest('/admin/analytics'),
    getAllPatients: () => apiRequest('/admin/patients'),
    getAllDoctors: () => apiRequest('/admin/doctors'),
    getAllCases: (status) => apiRequest(`/admin/cases${status ? `?status=${status}` : ''}`),
    getAllPayments: () => apiRequest('/admin/payments'),
  
    getNotifications: () => apiRequest('/notifications'),
    markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  };
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ROLE TAB SWITCHER (Login UI)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let activeLoginRole = 'patient';
  function selectRoleTab(role) {
    activeLoginRole = role;
    ['patient','doctor','chief','admin'].forEach(r => {
      document.getElementById('rtab-'+r).classList.toggle('active', r === role);
      const form = document.getElementById('lform-'+r);
      if (form) form.style.display = r === role ? '' : 'none';
    });
  }
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE & DATA
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let currentRole = null;
  let currentPage = null;
  
  const DOCTORS = [
    {id:1,name:'Dr. Priya Venkat',spec:'Cardiologist',exp:'14 yrs',hosp:'Apollo Hospitals',rating:'4.9 
â˜…',avatar:'ðŸ‘©â€âš•ï¸'},
    {id:2,name:'Dr. Ramesh Kumar',spec:'General Physician',exp:'18 yrs',hosp:'AIIMS Delhi',rating:'4.8 
â˜…',avatar:'ðŸ‘¨â€âš•ï¸'},
    {id:3,name:'Dr. Sunita Nair',spec:'Neurologist',exp:'11 yrs',hosp:'Fortis Hospital',rating:'4.7 
â˜…',avatar:'ðŸ‘©â€âš•ï¸'},
    {id:4,name:'Dr. Arjun Mehta',spec:'Pulmonologist',exp:'9 yrs',hosp:'Max Healthcare',rating:'4.9 
â˜…',avatar:'ðŸ‘¨â€âš•ï¸'},
    {id:5,name:'Dr. Kavitha Rajan',spec:'Dermatologist',exp:'13 yrs',hosp:'Manipal Hospitals',rating:'4.6 
â˜…',avatar:'ðŸ‘©â€âš•ï¸'},
  ];
  
  const SIDE_EFFECTS = ['Fever','Headache','Skin Rash','Nausea','Vomiting','Dizziness','Itching','Breathing 
Difficulty'];
  
  // LocalStorage helpers
  function getStorage(key){try{return JSON.parse(localStorage.getItem('mt_'+key)||'null');}catch{return null;}}
  function setStorage(key,val){localStorage.setItem('mt_'+key,JSON.stringify(val));}
  
  function getCases(){return getStorage('cases')||[];}
  function saveCases(c){setStorage('cases',c);}
  function getCase(id){return getCases().find(c=>c.id===id);}
  function updateCase(id,patch){
    const cases=getCases();
    const i=cases.findIndex(c=>c.id===id);
    if(i>-1){cases[i]={...cases[i],...patch};saveCases(cases);}
  }
  
  // Init sample data if first time
  (function initData(){
    if(!getStorage('initialized')){
      saveCases([
        {
          id:'#MT-001',date:'2025-06-18',patientName:'Harini S.',age:28,gender:'Female',
          symptoms:'Persistent cough for 2 weeks, mild fever, fatigue',
          sideEffects:['Fever','Headache'],otherSE:'Occasional dizziness at night',
          prescriptionDataUrl:'',
          selectedDoctors:[1,2,3],
          status:'Chief Doctor Review',
          doctorDecision:'Revisit Doctor',
          doctorReason:'Drug interaction detected between Amoxicillin and Ibuprofen. Recommend alternative NSAID.',
          chiefDecision:null,chiefReason:'',
          payment:'paid',caseId:'#MT-001'
        }
      ]);
      setStorage('initialized',true);
    }
  })();
  
  // New review form state
  let rxFormState = {
    step:1, caseId:null, prescriptionDataUrl:'', prescriptionName:'', prescriptionFile:null,
    age:'', gender:'', symptoms:'', sideEffects:[], otherSE:'',
    selectedDoctors:[], paid:false
  };
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SVG ICON HELPERS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const ICONS = {
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 
22"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect 
x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
    bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 
0"/></svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line 
x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 
21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    stethoscope: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 
0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" 
y1="20" x2="6" y2="14"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line 
x1="21" y1="12" x2="9" y2="12"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 
18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" 
stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    bot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 
7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    credit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" 
y2="10"/></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 
14 8 20 8"/></svg>`,
  };
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // TOAST
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function toast(msg,type='success'){
    const svgs={
      success:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" 
stroke-linejoin="round" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>',
      error:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" 
stroke-linejoin="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" 
y2="18"/></svg>',
      info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" 
stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" 
y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      warning:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" 
stroke-linejoin="round" width="18" height="18"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 
0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    const el=document.createElement('div');
    el.className=`toast toast-${type}`;
    el.innerHTML=`${svgs[type]||svgs.info}<span>${msg}</span>`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(()=>el.remove(),3500);
  }
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LOGIN / LOGOUT
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  async function login(role){
    const userFieldId = {patient:'p-user', doctor:'d-user', chief:'c-user', admin:'a-user'}[role];
    const passFieldId = {patient:'p-pass', doctor:'d-pass', chief:'c-pass', admin:'a-pass'}[role];
    const email = document.getElementById(userFieldId).value.trim();
    const password = document.getElementById(passFieldId).value;
  
    if (!email || !password) {
      toast('Please enter your email and password', 'error');
      return;
    }
  
    const submitBtn = document.querySelector(`#lform-${role} .btn-login-submit`);
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;
  
    try {
      const result = await api.login(email, password, role);
      setSession(result.user, result.accessToken, result.refreshToken);
  
      currentRole = role;
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('app').classList.add('active');
      document.getElementById('sidebar').className = `sidebar role-${role}`;
      setupSidebar(role);
      navigateTo(defaultPage(role));
      toast(`Welcome back, ${result.user.name}!`, 'success');
    } catch (err) {
      toast(err.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
  
  function defaultPage(role){
    return {patient:'p-dashboard',doctor:'d-dashboard',chief:'cd-dashboard',admin:'ad-dashboard'}[role];
  }
  
  function logout(){
    currentRole=null;
    clearSession();
    document.getElementById('loginPage').style.display='flex';
    document.getElementById('app').classList.remove('active');
    rxFormState={step:1,caseId:null,prescriptionDataUrl:'',prescriptionName:'',prescriptionFile:null,age:'',gender:'',s
ymptoms:'',sideEffects:[],otherSE:'',selectedDoctors:[],paid:false};
    toast('Logged out successfully','info');
  }
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SIDEBAR CONFIG
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const NAV_CONFIG = {
    patient:[
      {id:'p-dashboard',icon:'home',label:'Dashboard'},
      {id:'p-profile',icon:'user',label:'My Profile'},
      {id:'p-new-review',icon:'plus',label:'New Review'},
      {id:'p-my-reviews',icon:'clipboard',label:'My Reviews'},
      {id:'p-notifications',icon:'bell',label:'Notifications',badge:2},
    ],
    doctor:[
      {id:'d-dashboard',icon:'home',label:'Dashboard'},
      {id:'d-cases',icon:'folder',label:'Assigned Cases'},
      {id:'d-profile',icon:'user',label:'My Profile'},
    ],
    chief:[
      {id:'cd-dashboard',icon:'home',label:'Dashboard'},
      {id:'cd-cases',icon:'alert',label:'Escalated Cases'},
      {id:'cd-profile',icon:'user',label:'My Profile'},
    ],
    admin:[
      {id:'ad-dashboard',icon:'home',label:'Dashboard'},
      {id:'ad-patients',icon:'users',label:'Patients'},
      {id:'ad-doctors',icon:'stethoscope',label:'Doctors'},
      {id:'ad-cases',icon:'folder',label:'All Cases'},
      {id:'ad-reports',icon:'chart',label:'Reports'},
    ]
  };
  
  const USER_INFO = {
    patient:{name:'Harini S.',email:'harini@gmail.com',avatar:'H'},
    doctor:{name:'Dr. Ramesh Kumar',email:'ramesh@hospital.in',avatar:'R'},
    chief:{name:'Dr. Sunita Nair',email:'sunita@hospital.in',avatar:'S'},
    admin:{name:'Admin User',email:'admin@meditrust.in',avatar:'A'}
  };
  
  const ROLE_LABELS={patient:'Patient',doctor:'Doctor',chief:'Chief Doctor',admin:'Administrator'};
  
  function setupSidebar(role){
    const nav=NAV_CONFIG[role];
    const user=USER_INFO[role];
    document.getElementById('sb-role-text').textContent=ROLE_LABELS[role];
    document.getElementById('sb-avatar').textContent=user.avatar;
    document.getElementById('sb-name').textContent=user.name;
    document.getElementById('sb-email').textContent=user.email;
  
    const navEl=document.getElementById('sidebar-nav');
    navEl.innerHTML=`<div class="nav-section-label">Menu</div>`;
    nav.forEach(item=>{
      const el=document.createElement('div');
      el.className='nav-item';
      el.id=`nav-${item.id}`;
      el.innerHTML=`<span class="nav-icon">${ICONS[item.icon]||''}</span><span>${item.label}</span>${item.badge?`<span 
class="nav-badge">${item.badge}</span>`:''}`;
      el.onclick=()=>navigateTo(item.id);
      navEl.appendChild(el);
    });
  
    // logout
    const logoutEl=document.createElement('div');
    logoutEl.className='nav-item';
    logoutEl.style.marginTop='auto';
    logoutEl.innerHTML=`<span class="nav-icon">${ICONS.logout}</span><span>Logout</span>`;
    logoutEl.onclick=logout;
    navEl.appendChild(logoutEl);
  }
  
  function navigateTo(pageId){
    currentPage=pageId;
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
    const navItem=document.getElementById(`nav-${pageId}`);
    if(navItem) navItem.classList.add('active');
    renderPage(pageId);
  }
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAGE ROUTER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function renderPage(pageId){
    const body=document.getElementById('pageBody');
    body.innerHTML='';
    const pages={
      'p-dashboard': renderPatientDashboard,
      'p-profile': renderPatientProfile,
      'p-new-review': renderNewReview,
      'p-my-reviews': renderMyReviews,
      'p-notifications': renderNotifications,
      'd-dashboard': renderDoctorDashboard,
      'd-cases': renderDoctorCases,
      'd-profile': renderDoctorProfile,
      'cd-dashboard': renderChiefDashboard,
      'cd-cases': renderChiefCases,
      'cd-profile': renderChiefProfile,
      'ad-dashboard': renderAdminDashboard,
      'ad-patients': renderAdminPatients,
      'ad-doctors': renderAdminDoctors,
      'ad-cases': renderAdminCases,
      'ad-reports': renderAdminReports,
    };
    if(pages[pageId]) pages[pageId](body);
    else body.innerHTML='<p>Page not found</p>';
  }
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€ PATIENT PAGES â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  async function renderPatientDashboard(body){
    setTopbar('Dashboard','Overview of your prescription reviews');
    body.innerHTML=`<div class="page-section"><div style="text-align:center;padding:60px;color:var(--n-400);">Loading 
your dashboard...</div></div>`;
  
    let cases=[];
    try {
      const data=await api.getMyCases();
      cases=data.cases||[];
    } catch(err){
      toast(err.message||'Failed to load dashboard','error');
    }
  
    const pending=cases.filter(c=>c.status!=='completed').length;
    const completed=cases.filter(c=>c.status==='completed').length;
    const latest=cases[0]; // API already sorts newest first
    const user=getCurrentUser();
  
    body.innerHTML=`
    <div class="page-section">
  
      <!-- â”€â”€ UPLOAD HERO â”€â”€ -->
      <div class="upload-hero">
        <div class="upload-hero-header">
          <div class="upload-hero-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round" width="28" height="28" color="var(--brand-blue)">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
          </div>
          <div>
            <h2>Upload Your Prescription</h2>
            <p>Get your medication reviewed by 3 verified specialist doctors â€” fast, safe, and confidential</p>
          </div>
          <button class="btn btn-primary btn-lg" onclick="navigateTo('p-new-review')" 
style="margin-left:auto;flex-shrink:0;">
            ${ICONS.plus}
            New Review
          </button>
        </div>
        <div class="upload-hero-body">
          <div class="upload-drop-area" onclick="navigateTo('p-new-review')" style="cursor:pointer;">
            <div class="upload-drop-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round" width="34" height="34">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            </div>
            <h4>Drop your prescription here or <span class="browse-link">browse files</span></h4>
            <p>Your files are encrypted end-to-end and reviewed by MCI-verified doctors</p>
            <div class="upload-file-types" style="margin-top:14px;">
              <div class="uft-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round" width="13" height="13"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" 
cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                JPG / PNG
              </div>
              <div class="uft-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 
2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                PDF
              </div>
              <div class="uft-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round" width="13" height="13"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Max 10 MB
              </div>
            </div>
          </div>
  
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px;">
            <div class="feature-chip">
              <div class="feature-chip-icon" style="background:var(--brand-blue-lt);color:var(--brand-blue);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div class="feature-chip-title">AI Pre-Screening</div>
                <div class="feature-chip-sub">Drug interaction check</div>
              </div>
            </div>
            <div class="feature-chip">
              <div class="feature-chip-icon" style="background:var(--brand-emerald-lt);color:var(--brand-emerald-dk);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" 
cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <div class="feature-chip-title">3 Specialist Doctors</div>
                <div class="feature-chip-sub">MCI-registered experts</div>
              </div>
            </div>
            <div class="feature-chip">
              <div class="feature-chip-icon" style="background:var(--c-warning-bg);color:var(--c-warning-dk);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 
14"/></svg>
              </div>
              <div>
                <div class="feature-chip-title">24â€“48 Hour Review</div>
                <div class="feature-chip-sub">Fast turnaround time</div>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      <!-- â”€â”€ STAT CARDS â”€â”€ -->
      <div class="stat-grid stat-grid-4" style="margin-bottom:22px;">
        <div class="stat-card">
          <div class="stat-icon-wrap si-blue">${ICONS.folder}</div>
          <div class="stat-content">
            <div class="stat-val">${cases.length}</div>
            <div class="stat-label">Total Reviews</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-amber">${ICONS.alert}</div>
          <div class="stat-content">
            <div class="stat-val">${pending}</div>
            <div class="stat-label">Pending Reviews</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-green">${ICONS.check}</div>
          <div class="stat-content">
            <div class="stat-val">${completed}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-teal">${ICONS.stethoscope}</div>
          <div class="stat-content">
            <div class="stat-val">3</div>
            <div class="stat-label">Doctors Assigned</div>
          </div>
        </div>
      </div>
  
      ${latest ? `
      <div class="card">
        <div class="card-header">
          <h3>Latest Case Status</h3>
          <button class="btn btn-outline btn-sm" onclick="navigateTo('p-my-reviews')">View All â†’</button>
        </div>
        <div class="card-body">
          ${renderWorkflowStrip(latest)}
          <div class="flex gap-16" style="margin-top:16px;flex-wrap:wrap;">
            <div><span class="text-sm text-muted">Case ID</span><br><strong 
style="font-size:14px;">${latest._id.slice(-8).toUpperCase()}</strong></div>
            <div><span class="text-sm text-muted">Status</span><br>${getStatusBadge(latest.status)}</div>
            <div><span class="text-sm text-muted">Final Recommendation</span><br><strong>${latest.finalRecommendation?g
etDecisionBadge(latest.finalRecommendation):'Pending'}</strong></div>
          </div>
        </div>
      </div>` : ''}
    </div>`;
  }
  
  function renderWorkflowStrip(c){
    const inDoctorReview=['pending_review','in_review'].includes(c.status);
    const inChiefReview=['conflict','chief_review'].includes(c.status);
    const isDone=c.status==='completed';
    const steps=[
      {label:'Uploaded',done:true,icon:'upload',cls:'wf-done'},
      {label:'AI Screen',done:true,icon:'bot',cls:'wf-done'},
      {label:'Dr. Review',done:inChiefReview||isDone,icon:'stethoscope',cls:(inChiefReview||isDone)?'wf-done':(inDoctor
Review?'wf-active':'wf-pending')},
      {label:'Chief Dr.',done:isDone,icon:'shield',cls:isDone?'wf-done':(inChiefReview?'wf-active':'wf-pending')},
      {label:'Decision',done:isDone,icon:'check',cls:isDone?'wf-done':'wf-pending'},
    ];
    return `<div class="workflow-strip">${steps.map((s,i)=>`
      <div class="wf-step">
        <div class="wf-dot ${s.cls}">${ICONS[s.icon]||''}</div>
        <div class="wf-label">${s.label}</div>
      </div>
      ${i<steps.length-1?'<div class="wf-arrow">â€º</div>':''}
    `).join('')}</div>`;
  }
  
  function renderPatientProfile(body){
    setTopbar('My Profile','Manage your personal information');
    body.innerHTML=`
    <div class="page-section">
      <div class="profile-avatar-section">
        <div class="profile-avatar">ðŸ§‘â€ðŸ’¼</div>
        <div class="profile-info">
          <h2>Harini S.</h2>
          <p>Patient ID: MT-PAT-0042 &nbsp;|&nbsp; Member since June 2025</p>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Personal Information</h3><button class="btn btn-outline btn-sm">Edit 
Profile</button></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Full Name</label><input class="form-control" 
value="Harini S."></div>
            <div class="form-group"><label class="form-label">Age</label><input class="form-control" value="28"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Gender</label><input class="form-control" 
value="Female"></div>
            <div class="form-group"><label class="form-label">Blood Group</label><input class="form-control" 
value="O+"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Email</label><input class="form-control" 
value="harini@gmail.com"></div>
            <div class="form-group"><label class="form-label">Phone</label><input class="form-control" value="+91 
98765 43210"></div>
          </div>
          <div class="form-group"><label class="form-label">Address</label><textarea class="form-control" rows="2">12, 
Anna Nagar, Chennai - 600040, Tamil Nadu</textarea></div>
          <div class="form-group"><label class="form-label">Known Allergies</label><input class="form-control" 
value="Penicillin, Sulfa drugs"></div>
          <div class="form-group"><label class="form-label">Existing Conditions</label><input class="form-control" 
value="Mild Hypertension (Stage 1)"></div>
          <button class="btn btn-primary btn-lg" onclick="toast('Profile updated successfully','success')">Save 
Changes</button>
        </div>
      </div>
    </div>`;
  }
  
  async function renderNewReview(body){
    setTopbar('New Review','Submit a prescription for multi-doctor verification');
    if(!rxFormState.caseId){
      body.innerHTML=`<div class="page-section"><div 
style="text-align:center;padding:60px;color:var(--n-400);">Setting up your review...</div></div>`;
      try {
        const data=await api.createCase();
        rxFormState.caseId=data.case._id;
      } catch(err){
        toast(err.message||'Failed to start a new review','error');
        return;
      }
    }
    renderReviewStep(body, rxFormState.step);
  }
  
  function renderReviewStep(body, step){
    const stepNames=['Upload','Details','AI Screen','Select Doctors','Payment','Confirmation'];
    const stepsHtml=stepNames.map((s,i)=>{
      const cls = i+1<step?'done':(i+1===step?'active':'');
      return `<div class="step ${cls}"><div class="step-dot">${i+1<step?'âœ“':(i+1)}</div><div 
class="step-label">${s}</div></div>`;
    }).join('');
  
    if(step===1) renderStep1(body, stepsHtml);
    else if(step===2) renderStep2(body, stepsHtml);
    else if(step===3) renderStep3(body, stepsHtml);
    else if(step===4) renderStep4(body, stepsHtml);
    else if(step===5) renderStep5(body, stepsHtml);
    else if(step===6) renderStep6(body, stepsHtml);
  }
  
  function renderStep1(body, stepsHtml){
    body.innerHTML=`
    <div class="page-section">
      <div class="steps">${stepsHtml}</div>
      <div class="card">
        <div class="card-header"><h3>Upload Prescription</h3></div>
        <div class="card-body">
          <div class="upload-zone" id="uploadZone">
            <input type="file" accept="image/*,.pdf" id="rxFile" onchange="handleFileUpload(event)">
            <div class="upload-icon">${ICONS.upload}</div>
            <h4>Drop your prescription here</h4>
            <p>Supports JPG, PNG, PDF &nbsp;Â·&nbsp; Max 10 MB</p>
          </div>
          ${rxFormState.prescriptionDataUrl ? `
          <div class="upload-preview mt-16">
            <img src="${rxFormState.prescriptionDataUrl}" alt="Prescription preview">
          </div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:8px;">
            <span class="badge badge-green">âœ“ Uploaded</span>
            <span class="text-sm text-muted">${rxFormState.prescriptionName}</span>
          </div>` : ''}
          <div style="margin-top:24px;display:flex;justify-content:flex-end;">
            <button class="btn btn-primary btn-lg" id="step1ContinueBtn" onclick="uploadAndContinue()" 
${rxFormState.prescriptionDataUrl?'':'disabled'}>Continue â†’</button>
          </div>
        </div>
      </div>
    </div>`;
  }
  
  async function handleFileUpload(e){
    const file=e.target.files[0];
    if(!file) return;
    rxFormState.prescriptionName=file.name;
    rxFormState.prescriptionFile=file; // keep the real File object for upload
  
    // Local preview only (instant, no server round-trip needed for this)
    if(file.type.startsWith('image/')){
      const reader=new FileReader();
      reader.onload=ev=>{
        rxFormState.prescriptionDataUrl=ev.target.result;
        renderStep1(document.getElementById('pageBody'),'');
      };
      reader.readAsDataURL(file);
    } else {
      rxFormState.prescriptionDataUrl='pdf';
      renderStep1(document.getElementById('pageBody'),'');
    }
  }
  
  async function uploadAndContinue(){
    if(!rxFormState.prescriptionFile){
      toast('Please upload a prescription first','error');
      return;
    }
    const btn=document.getElementById('step1ContinueBtn');
    btn.textContent='Uploading...';
    btn.disabled=true;
    try {
      const formData=new FormData();
      formData.append('prescription', rxFormState.prescriptionFile);
      await api.uploadDocuments(rxFormState.caseId, formData);
      goStep(2);
    } catch(err){
      toast(err.message||'Upload failed. Please try again.','error');
      btn.textContent='Continue â†’';
      btn.disabled=false;
    }
  }
  
  function goStep(n){
    rxFormState.step=n;
    renderReviewStep(document.getElementById('pageBody'),n);
  }
  
  function renderStep2(body, stepsHtml){
    body.innerHTML=`
    <div class="page-section">
      <div class="steps">${stepsHtml}</div>
      <div class="card">
        <div class="card-header"><h3>Patient Details &amp; Symptoms</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Age</label>
              <input class="form-control" type="number" placeholder="Enter your age" id="rxAge" 
value="${rxFormState.age}">
            </div>
            <div class="form-group">
              <label class="form-label">Gender</label>
              <select class="form-control" id="rxGender">
                <option value="">Select gender</option>
                <option value="Male" ${rxFormState.gender==='Male'?'selected':''}>Male</option>
                <option value="Female" ${rxFormState.gender==='Female'?'selected':''}>Female</option>
                <option value="Other" ${rxFormState.gender==='Other'?'selected':''}>Other</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Current Symptoms</label>
            <textarea class="form-control" placeholder="Describe your symptoms in detail..." id="rxSymptoms" 
rows="4">${rxFormState.symptoms}</textarea>
            <p class="form-hint">Be as specific as possible â€“ duration, severity, when they started</p>
          </div>
          <div class="form-group">
            <label class="form-label" style="margin-bottom:10px;">Side Effects Experienced</label>
            <div class="checkbox-grid" id="seCbGrid">
              ${SIDE_EFFECTS.map(se=>`
              <div class="cb-item ${rxFormState.sideEffects.includes(se)?'checked':''}" onclick="toggleSE('${se}')">
                <div class="cb-check">${rxFormState.sideEffects.includes(se)?'âœ“':''}</div>
                ${se}
              </div>`).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Other Side Effects / Additional Notes</label>
            <textarea class="form-control" placeholder="Any other symptoms or relevant medical history..." 
id="rxOtherSE" rows="3">${rxFormState.otherSE}</textarea>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button class="btn btn-outline" onclick="goStep(1)">â† Back</button>
            <button class="btn btn-primary btn-lg" onclick="saveStep2AndContinue()">Continue â†’</button>
          </div>
        </div>
      </div>
    </div>`;
  }
  
  function toggleSE(se){
    if(rxFormState.sideEffects.includes(se))
      rxFormState.sideEffects=rxFormState.sideEffects.filter(s=>s!==se);
    else rxFormState.sideEffects.push(se);
    renderStep2(document.getElementById('pageBody'),'');
  }
  
  async function saveStep2AndContinue(){
    rxFormState.age=document.getElementById('rxAge').value;
    rxFormState.gender=document.getElementById('rxGender').value;
    rxFormState.symptoms=document.getElementById('rxSymptoms').value;
    rxFormState.otherSE=document.getElementById('rxOtherSE').value;
    if(!rxFormState.age||!rxFormState.gender||!rxFormState.symptoms){
      toast('Please fill all required fields','error');return;
    }
    const combinedSideEffects=[...rxFormState.sideEffects, rxFormState.otherSE].filter(Boolean).join(', ');
    try {
      await api.updateCase(rxFormState.caseId, {
        age: parseInt(rxFormState.age, 10),
        gender: rxFormState.gender.toLowerCase(),
        symptoms: rxFormState.symptoms,
        sideEffects: combinedSideEffects,
      });
      goStep(3);
    } catch(err){
      toast(err.message||'Failed to save details','error');
    }
  }
  
  function renderStep3(body, stepsHtml){
    body.innerHTML=`
    <div class="page-section">
      <div class="steps">${stepsHtml}</div>
      <div class="card">
        <div class="card-header"><h3>AI Pre-Screening</h3></div>
        <div class="card-body">
          <div class="ai-processing" id="aiBox">
            <div class="ai-spinner-wrap">
              <div class="ai-spinner" id="aiSpinner"></div>
              <div class="ai-spinner-inner"></div>
              <div class="ai-orb"></div>
            </div>
            <div class="ai-step-label" id="aiLabel">Uploading prescription...</div>
            <div class="ai-sublabel" id="aiSub">Please wait while our AI analyses your document</div>
            <div class="ai-progress">
              <div class="ai-progress-bar" id="aiBar" style="width:0%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    runAIAnimation();
  }
  
  function runAIAnimation(){
    const steps=[
      {label:'Uploading prescription...',sub:'Encrypting and uploading securely',pct:20},
      {label:'Running AI Drug Analysis...',sub:'Checking drug interactions & contraindications',pct:50},
      {label:'Screening prescription data...',sub:'Cross-referencing with medical databases',pct:75},
      {label:'Finding available doctors...',sub:'Matching with verified MCI-registered specialists',pct:90},
      {label:'Analysis complete!',sub:'3 matching doctors found',pct:100},
    ];
    let i=0;
    const tick=()=>{
      if(i>=steps.length){
        setTimeout(()=>goStep(4),500);return;
      }
      const s=steps[i];
      document.getElementById('aiLabel').textContent=s.label;
      document.getElementById('aiSub').textContent=s.sub;
      document.getElementById('aiBar').style.width=s.pct+'%';
      i++;
      setTimeout(tick,700);
    };
    setTimeout(tick,400);
  }
  
  async function renderStep4(body, stepsHtml){
    body.innerHTML=`
    <div class="page-section">
      <div class="steps">${stepsHtml}</div>
      <div class="card">
        <div class="card-header"><h3>Select 3 Doctors for Review</h3></div>
        <div class="card-body">
          <div style="text-align:center;padding:40px;color:var(--n-400);">Loading available doctors...</div>
        </div>
      </div>
    </div>`;
  
    let doctors=[];
    try {
      const data=await api.getAvailableDoctors();
      doctors=data.doctors||[];
    } catch(err){
      toast(err.message||'Failed to load doctors','error');
      return;
    }
    window.__mtAvailableDoctors=doctors;
  
    body.innerHTML=`
    <div class="page-section">
      <div class="steps">${stepsHtml}</div>
      <div class="card">
        <div class="card-header"><h3>Select 3 Doctors for Review</h3></div>
        <div class="card-body">
          <div class="doctor-select-info">
            <span>Select exactly <strong>3 doctors</strong> to review your prescription</span>
            <span class="doctor-select-count" id="selCount">${rxFormState.selectedDoctors.length} / 3 Selected</span>
          </div>
          ${doctors.length===0?`<p style="color:var(--n-400);text-align:center;padding:24px;">No doctors are available 
right now. Please try again shortly.</p>`:`
          <div class="doctor-cards-grid" id="doctorGrid">
            ${doctors.map(d=>`
            <div class="doctor-card ${rxFormState.selectedDoctors.includes(d._id)?'selected':''}" id="dc-${d._id}" 
onclick="toggleDoctor('${d._id}')">
              <div class="dc-avatar">ðŸ‘¨â€âš•ï¸</div>
              <div class="dc-name">${d.name}</div>
              <div class="dc-spec">${d.specialty||'General'}</div>
              <div class="dc-exp">Experience: ${d.experienceYears||0} yrs</div>
              <div class="dc-rating">â­ ${d.rating||'New'}</div>
            </div>`).join('')}
          </div>`}
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;">
            <button class="btn btn-outline" onclick="goStep(2)">â† Back</button>
            <button class="btn btn-primary btn-lg" onclick="confirmDoctorSelection()">Proceed to Payment â†’</button>
          </div>
        </div>
      </div>
    </div>`;
  }
  
  function toggleDoctor(id){
    if(rxFormState.selectedDoctors.includes(id)){
      rxFormState.selectedDoctors=rxFormState.selectedDoctors.filter(d=>d!==id);
    } else {
      if(rxFormState.selectedDoctors.length>=3){toast('Maximum 3 doctors allowed','warning');return;}
      rxFormState.selectedDoctors.push(id);
    }
    document.getElementById(`dc-${id}`).classList.toggle('selected',rxFormState.selectedDoctors.includes(id));
    document.getElementById('selCount').textContent=`${rxFormState.selectedDoctors.length} / 3 Selected`;
  }
  
  async function confirmDoctorSelection(){
    if(rxFormState.selectedDoctors.length!==3){toast('Please select exactly 3 doctors','error');return;}
    try {
      await api.selectDoctors(rxFormState.caseId, rxFormState.selectedDoctors);
      goStep(5);
    } catch(err){
      toast(err.message||'Failed to select doctors','error');
    }
  }
  
  function renderStep5(body, stepsHtml){
    const availableDoctors=window.__mtAvailableDoctors||[];
    const selDoctors=availableDoctors.filter(d=>rxFormState.selectedDoctors.includes(d._id));
    body.innerHTML=`
    <div class="page-section">
      <div class="steps">${stepsHtml}</div>
      <div class="card">
        <div class="card-header"><h3>Payment Summary</h3></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
            <div>
              <h4 
style="font-size:13px;font-weight:800;color:var(--n-900);margin-bottom:14px;font-family:var(--font-heading);">Selected 
Doctors</h4>
              ${selDoctors.map(d=>`
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding:14px 
16px;background:var(--n-50);border-radius:var(--r-sm);border:1px solid var(--border);">
                <span style="font-size:24px;">ðŸ‘¨â€âš•ï¸</span>
                <div>
                  <div 
style="font-size:13px;font-weight:700;color:var(--n-900);font-family:var(--font-heading);">${d.name}</div>
                  <div style="font-size:11px;color:var(--n-400);">${d.specialty||'General'}</div>
                </div>
              </div>`).join('')}
            </div>
            <div>
              <h4 
style="font-size:13px;font-weight:800;color:var(--n-900);margin-bottom:14px;font-family:var(--font-heading);">Review 
Charges</h4>
              <div class="payment-summary">
                <div class="pay-row"><span>Doctor Review Service (Ã—3)</span><span 
class="pay-amount">â‚¹450</span></div>
                <div class="pay-row"><span>AI Pre-Screening</span><span class="pay-amount">â‚¹50</span></div>
                <div class="pay-row"><span>Platform Fee</span><span class="pay-amount">â‚¹0</span></div>
                <div class="pay-row"><span>GST (18%)</span><span class="pay-amount">â‚¹0</span></div>
                <div class="pay-row"><span>Total Amount</span><span class="pay-amount" 
style="color:var(--brand-blue);font-size:18px;font-family:var(--font-heading);">â‚¹500</span></div>
              </div>
              <div style="margin-top:12px;padding:12px 14px;background:var(--c-success-bg);border-radius:var(--r-sm);fo
nt-size:12px;color:var(--c-success-dk);display:flex;align-items:center;gap:8px;font-weight:600;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
stroke-linejoin="round" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Secured by Razorpay &nbsp;Â·&nbsp; 256-bit SSL Encryption
              </div>
              <div style="display:flex;gap:12px;margin-top:16px;justify-content:flex-end;">
                <button class="btn btn-outline" onclick="goStep(4)">â† Back</button>
                <button class="btn btn-success btn-lg" id="payBtn" onclick="processPayment()">
                  ${ICONS.credit}
                  Pay â‚¹500 â†’
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }
  
  async function processPayment(){
    const btn=document.getElementById('payBtn');
    btn.disabled=true;
    btn.textContent='Preparing payment...';
  
    let order;
    try {
      order=await api.createPaymentOrder(rxFormState.caseId);
    } catch(err){
      toast(err.message||'Failed to start payment','error');
      btn.disabled=false;
      btn.innerHTML=`${ICONS.credit} Pay â‚¹500 â†’`;
      return;
    }
  
    // Dummy mode (no Razorpay key configured) - auto-confirm without a real checkout
    if(!order.keyId){
      try {
        await api.verifyPayment(rxFormState.caseId, { orderId: order.orderId, paymentId: 'DUMMY', signature: 'DUMMY' 
});
        rxFormState.paid=true;
        goStep(6);
        toast('Payment successful!','success');
      } catch(err){
        toast(err.message||'Payment verification failed','error');
      }
      btn.disabled=false;
      btn.innerHTML=`${ICONS.credit} Pay â‚¹500 â†’`;
      return;
    }
  
    // Real Razorpay Checkout (test mode)
    const user=getCurrentUser();
    const rzp=new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'MediTrust',
      description: 'Multi-Doctor Prescription Review',
      order_id: order.orderId,
      prefill: { name: user?.name||'', email: user?.email||'' },
      theme: { color: '#2563eb' },
      handler: async function(response){
        try {
          await api.verifyPayment(rxFormState.caseId, {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
          rxFormState.paid=true;
          goStep(6);
          toast('Payment successful!','success');
        } catch(err){
          toast(err.message||'Payment verification failed','error');
        }
      },
      modal: {
        ondismiss: function(){
          btn.disabled=false;
          btn.innerHTML=`${ICONS.credit} Pay â‚¹500 â†’`;
          toast('Payment cancelled','info');
        }
      }
    });
    rzp.open();
    btn.disabled=false;
    btn.innerHTML=`${ICONS.credit} Pay â‚¹500 â†’`;
  }
  
  function renderStep6(body, stepsHtml){
    body.innerHTML=`
    <div class="page-section">
      <div class="steps">${stepsHtml}</div>
      <div class="card">
        <div class="card-body">
          <div class="success-container">
            <div class="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" 
stroke-linejoin="round" width="44" height="44">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2>Request Submitted Successfully!</h2>
            <p>Your prescription has been assigned to 3 verified doctors for review.</p>
            <div class="case-id-badge">${rxFormState.caseId.slice(-8).toUpperCase()}</div>
            <p style="font-size:12px;color:var(--n-400);margin-bottom:28px;">
              Estimated review time: <strong>24â€“48 hours</strong><br>
              You'll be notified once doctors complete their review.
            </p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
              <button class="btn btn-primary btn-lg" onclick="navigateTo('p-my-reviews')">Track My Review</button>
              <button class="btn btn-outline btn-lg" onclick="resetReview()">+ Submit Another</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }
  
  function resetReview(){
    rxFormState={step:1,caseId:null,prescriptionDataUrl:'',prescriptionName:'',prescriptionFile:null,age:'',gender:'',s
ymptoms:'',sideEffects:[],otherSE:'',selectedDoctors:[],paid:false};
    navigateTo('p-new-review');
  }
  
  async function renderMyReviews(body){
    setTopbar('My Reviews','Track all your submitted prescription reviews');
    body.innerHTML=`<div class="page-section"><div style="text-align:center;padding:60px;color:var(--n-400);">Loading 
your reviews...</div></div>`;
  
    let cases=[];
    try {
      const data=await api.getMyCases();
      cases=data.cases||[];
    } catch(err){
      toast(err.message||'Failed to load reviews','error');
    }
  
    window.__mtCasesCache = cases; // used by viewCaseDetails below
  
    body.innerHTML=`
    <div class="page-section">
      <div class="card">
        <div class="card-header">
          <h3>All Submissions (${cases.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="navigateTo('p-new-review')">+ New Review</button>
        </div>
        <div class="card-body card-body-flush">
          ${cases.length ? `
          <table class="mt-table">
            <thead><tr>
              <th>Case ID</th><th>Date</th><th>Status</th>
              <th>Final Recommendation</th><th>Action</th>
            </tr></thead>
            <tbody>${cases.map(c=>`
            <tr>
              <td><strong>${c._id.slice(-8).toUpperCase()}</strong></td>
              <td>${new Date(c.createdAt).toLocaleDateString()}</td>
              <td>${getStatusBadge(c.status)}</td>
              <td>${c.finalRecommendation?getDecisionBadge(c.finalRecommendation):'<span class="badge 
badge-gray">Pending</span>'}</td>
              <td><button class="btn btn-outline btn-sm" onclick="viewCaseDetails('${c._id}')">View â†’</button></td>
            </tr>`).join('')}</tbody>
          </table>` : `
          <div style="text-align:center;padding:64px 32px;">
            <div style="width:68px;height:68px;background:var(--n-100);border-radius:50%;display:flex;align-items:cente
r;justify-content:center;margin:0 auto 18px;color:var(--n-400);">${ICONS.clipboard}</div>
            <h3 style="color:var(--n-700);margin-bottom:8px;font-family:var(--font-heading);">No reviews submitted 
yet</h3>
            <p style="color:var(--n-400);margin-bottom:22px;">Submit your first prescription for expert multi-doctor 
review.</p>
            <button class="btn btn-primary" onclick="navigateTo('p-new-review')">Submit First Review</button>
          </div>`}
        </div>
      </div>
    </div>`;
  }
  
  function renderNotifications(body){
    setTopbar('Notifications','Updates on your prescription reviews');
    body.innerHTML=`
    <div class="page-section">
      <div class="card">
        <div class="card-header"><h3>Recent Notifications</h3></div>
        <div class="card-body" style="padding:0 24px;">
          <div class="notif-item">
            <div class="notif-item-icon" 
style="background:var(--brand-emerald-lt);color:var(--brand-emerald-dk);">${ICONS.bot}</div>
            <div class="notif-item-body">
              <h4>AI screening complete for ${getCases()[0]?.id||'#MT-001'}</h4>
              <p>Your prescription has been analysed and matched with 3 specialist doctors.</p>
            </div>
            <div class="notif-item-time">2h ago</div>
          </div>
          <div class="notif-item">
            <div class="notif-item-icon" 
style="background:var(--c-warning-bg);color:var(--c-warning-dk);">${ICONS.alert}</div>
            <div class="notif-item-body">
              <h4>Doctor escalated case to Chief Doctor</h4>
              <p>Dr. Ramesh Kumar has flagged a potential drug interaction. Chief Doctor review in progress.</p>
            </div>
            <div class="notif-item-time">5h ago</div>
          </div>
          <div class="notif-item">
            <div class="notif-item-icon" 
style="background:var(--c-success-bg);color:var(--c-success-dk);">${ICONS.check}</div>
            <div class="notif-item-body">
              <h4>Payment confirmed</h4>
              <p>â‚¹500 paid via Razorpay. Case ID assigned and review initiated.</p>
            </div>
            <div class="notif-item-time">Yesterday</div>
          </div>
          <div class="notif-item">
            <div class="notif-item-icon" 
style="background:var(--brand-blue-lt);color:var(--brand-blue);">${ICONS.activity}</div>
            <div class="notif-item-body">
              <h4>Welcome to MediTrust!</h4>
              <p>Your account has been created. Start by uploading your first prescription.</p>
            </div>
            <div class="notif-item-time">3 days ago</div>
          </div>
        </div>
      </div>
    </div>`;
  }
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€ DOCTOR PAGES â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  async function renderDoctorDashboard(body){
    setTopbar('Doctor Dashboard','Review assigned prescriptions');
    body.innerHTML=`<div class="page-section"><div style="text-align:center;padding:60px;color:var(--n-400);">Loading 
your cases...</div></div>`;
  
    const user=getCurrentUser();
    let cases=[], history=[];
    try {
      const [pendingData, historyData] = await Promise.all([
        api.getAssignedCases(),
        api.getDoctorCaseHistory(),
      ]);
      cases = pendingData.cases||[];
      history = historyData.reviews||[];
    } catch(err){
      toast(err.message||'Failed to load dashboard','error');
    }
  
    const approvedCount = history.filter(r=>r.decision==='safe').length;
    const escalatedCount = history.filter(r=>r.decision==='revisit_doctor').length;
  
    body.innerHTML=`
    <div class="page-section">
      <div class="welcome-card">
        <div>
          <h2>Good morning, ${user?.name||'Doctor'}!</h2>
          <p>You have ${cases.length} prescription(s) awaiting your review.</p>
        </div>
        <div class="wc-badge">
          <div class="wc-badge-val">MCI âœ“</div>
          <div class="wc-badge-label">Verified Doctor</div>
        </div>
      </div>
      <div class="stat-grid stat-grid-3" style="margin-bottom:22px;">
        <div class="stat-card">
          <div class="stat-icon-wrap si-amber">${ICONS.folder}</div>
          <div class="stat-content">
            <div class="stat-val">${cases.length}</div>
            <div class="stat-label">Pending Review</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-green">${ICONS.check}</div>
          <div class="stat-content">
            <div class="stat-val">${approvedCount}</div>
            <div class="stat-label">Approved Safe</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-red">${ICONS.alert}</div>
          <div class="stat-content">
            <div class="stat-val">${escalatedCount}</div>
            <div class="stat-label">Escalated</div>
          </div>
        </div>
      </div>
      ${cases.length > 0 ? `
      <div class="card">
        <div class="card-header"><h3>Pending Cases</h3></div>
        <div class="card-body card-body-flush">
          <table class="mt-table">
            <thead><tr><th>Case ID</th><th>Patient</th><th>Date</th><th>Symptoms 
Preview</th><th>Action</th></tr></thead>
            <tbody>${cases.map(c=>`
            <tr>
              <td><strong>${c._id.slice(-8).toUpperCase()}</strong></td>
              <td><div style="display:flex;align-items:center;gap:9px;"><div style="width:32px;height:32px;border-radiu
s:9px;background:var(--brand-blue-lt);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight
:800;color:var(--brand-blue);font-family:var(--font-heading);">${(c.patient?.name||'P')[0]}</div><div><div 
style="font-weight:700;">${c.patient?.name||'Patient'}</div><div 
style="font-size:11px;color:var(--n-400);">${c.age||'â€”'} yrs, ${c.gender||'â€”'}</div></div></div></td>
              <td>${new Date(c.createdAt).toLocaleDateString()}</td>
              <td style="max-width:200px;"><span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:ver
tical;overflow:hidden;">${(c.symptoms||'').substring(0,60)}</span></td>
              <td><button class="btn btn-primary btn-sm" onclick="openDoctorReview('${c._id}')">Review 
â†’</button></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>` : `
      <div class="card">
        <div class="card-body" style="text-align:center;padding:64px;">
          <div style="width:68px;height:68px;background:var(--c-success-bg);border-radius:50%;display:flex;align-items:
center;justify-content:center;margin:0 auto 18px;color:var(--c-success-dk);">${ICONS.check}</div>
          <h3 style="color:var(--n-800);margin-bottom:8px;font-family:var(--font-heading);">All caught up!</h3>
          <p style="color:var(--n-400);">No pending prescription reviews at this time.</p>
        </div>
      </div>`}
    </div>`;
  }
  
  async function openDoctorReview(caseId){
    document.getElementById('modal-title').textContent=`Review Case`;
    document.getElementById('modal-body').innerHTML=`<div 
style="text-align:center;padding:40px;color:var(--n-400);">Loading case...</div>`;
    openModal();
  
    let c;
    try {
      const data=await api.getCaseForReview(caseId);
      c=data.case;
    } catch(err){
      document.getElementById('modal-body').innerHTML=`<div 
style="text-align:center;padding:40px;color:var(--c-danger);">${err.message||'Failed to load case'}</div>`;
      return;
    }
  
    document.getElementById('modal-title').textContent=`Review Case â€“ ${c._id.slice(-8).toUpperCase()}`;
    document.getElementById('modal-body').innerHTML=`
    <div class="detail-section">
      <div class="detail-section-title">Patient Details</div>
      <div class="detail-row"><span class="detail-key">Patient</span><span 
class="detail-val">${c.patient?.name||'Patient'}</span></div>
      <div class="detail-row"><span class="detail-key">Age / Gender</span><span class="detail-val">${c.age||'â€”'} yrs 
/ ${c.gender||'â€”'}</span></div>
      <div class="detail-row"><span class="detail-key">Symptoms</span><span class="detail-val" 
style="max-width:300px;text-align:right;">${c.symptoms||'â€”'}</span></div>
      <div class="detail-row"><span class="detail-key">Side Effects</span><span 
class="detail-val">${c.sideEffects||'None reported'}</span></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Prescription</div>
      <div class="rx-image-container">
        ${c.prescriptionFile ? `<img src="http://localhost:5000${c.prescriptionFile}" alt="Prescription">` :
        `<div class="rx-placeholder"><p>No prescription image</p></div>`}
      </div>
    </div>
    ${c.ocrResult&&c.ocrResult.medicines&&c.ocrResult.medicines.length?`
    <div class="detail-section">
      <div class="detail-section-title">Medicines Detected (OCR - verify against image above)</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${c.ocrResult.medicines.map(m=>`<span class="chip">${m}</span>`).join('')}
      </div>
    </div>`:''}
    <div class="detail-section">
      <div class="detail-section-title">Your Decision</div>
      <div class="decision-options">
        <div class="decision-opt" id="opt-safe" onclick="selectDecision('safe')">
          <div class="decision-opt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="var(--c-success-dk)" 
stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><polyline points="20 6 9 17 4 
12"/></svg></div>
          <div class="decision-opt-label">Safe to Continue</div>
          <div class="decision-opt-desc">Prescription appears appropriate</div>
        </div>
        <div class="decision-opt" id="opt-revisit" onclick="selectDecision('revisit_doctor')">
          <div class="decision-opt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="var(--c-danger-dk)" 
stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><path d="m21.73 18-8-14a2 2 0 
0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" 
x2="12.01" y2="17"/></svg></div>
          <div class="decision-opt-label">Revisit Doctor</div>
          <div class="decision-opt-desc">Escalate to Chief Doctor</div>
        </div>
      </div>
      <div class="form-group mt-16">
        <label class="form-label">Reason / Notes</label>
        <textarea class="form-control" id="drReason" rows="4" placeholder="Document your clinical 
reasoning..."></textarea>
      </div>
      <button class="btn btn-primary btn-full btn-lg" id="submitReviewBtn" 
onclick="submitDoctorReview('${c._id}')">Submit Review</button>
    </div>`;
    window._drDecision=null;
    window.selectDecision=function(d){
      document.getElementById('opt-safe').className='decision-opt'+(d==='safe'?' selected-safe':'');
      document.getElementById('opt-revisit').className='decision-opt'+(d==='revisit_doctor'?' selected-revisit':'');
      window._drDecision=d;
    };
  }
  
  async function submitDoctorReview(caseId){
    const decision=window._drDecision;
    const reasoning=document.getElementById('drReason').value.trim();
    if(!decision){toast('Please select a decision','error');return;}
    if(!reasoning||reasoning.length<10){toast('Please add clinical reasoning (at least 10 
characters)','error');return;}
  
    const btn=document.getElementById('submitReviewBtn');
    btn.disabled=true;
    btn.textContent='Submitting...';
  
    try {
      const result=await api.submitReview(caseId, { decision, reasoning });
      closeModal();
      toast(result.message||'Review submitted successfully','success');
      renderDoctorDashboard(document.getElementById('pageBody'));
    } catch(err){
      toast(err.message||'Failed to submit review','error');
      btn.disabled=false;
      btn.textContent='Submit Review';
    }
    window._drDecision=null;
  }
  
  async function viewDoctorCaseReadOnly(caseId){
    document.getElementById('modal-title').textContent=`Case Details`;
    document.getElementById('modal-body').innerHTML=`<div 
style="text-align:center;padding:40px;color:var(--n-400);">Loading...</div>`;
    openModal();
  
    let c;
    try {
      const data=await api.getCaseForReview(caseId);
      c=data.case;
    } catch(err){
      document.getElementById('modal-body').innerHTML=`<div 
style="text-align:center;padding:40px;color:var(--c-danger);">${err.message||'Failed to load case'}</div>`;
      return;
    }
  
    document.getElementById('modal-title').textContent=`Case Details â€“ ${c._id.slice(-8).toUpperCase()}`;
    document.getElementById('modal-body').innerHTML=`
    <div class="detail-section">
      <div class="detail-section-title">Patient Details</div>
      <div class="detail-row"><span class="detail-key">Patient</span><span 
class="detail-val">${c.patient?.name||'Patient'}</span></div>
      <div class="detail-row"><span class="detail-key">Status</span><span 
class="detail-val">${getStatusBadge(c.status)}</span></div>
      <div class="detail-row"><span class="detail-key">Symptoms</span><span class="detail-val" 
style="max-width:300px;text-align:right;">${c.symptoms||'â€”'}</span></div>
    </div>
    ${c.finalReportSummary?`
    <div class="detail-section">
      <div class="detail-section-title">Final Report</div>
      <div style="background:var(--brand-emerald-lt);padding:13px 
16px;border-radius:var(--r-sm);font-size:13px;color:var(--n-800);border-left:3px solid 
var(--brand-emerald);">${c.finalReportSummary}</div>
    </div>`:'<p style="color:var(--n-400);padding:12px 0;">Awaiting other doctors / final report.</p>'}`;
  }
  
  async function renderDoctorCases(body){
    setTopbar('Assigned Cases','All cases assigned to you');
    body.innerHTML=`<div class="page-section"><div style="text-align:center;padding:60px;color:var(--n-400);">Loading 
cases...</div></div>`;
  
    let pending=[], history=[];
    try {
      const [pendingData, historyData] = await Promise.all([
        api.getAssignedCases(),
        api.getDoctorCaseHistory(),
      ]);
      pending = pendingData.cases||[];
      history = historyData.reviews||[];
    } catch(err){
      toast(err.message||'Failed to load cases','error');
    }
  
    const reviewedRows = history.map(r=>({
      _id: r.case?._id,
      patientName: 'â€”',
      date: r.createdAt,
      status: r.case?.status,
      myDecision: r.decision,
      isPending: false,
    }));
    const pendingRows = pending.map(c=>({
      _id: c._id,
      patientName: c.patient?.name||'Patient',
      date: c.createdAt,
      status: c.status,
      myDecision: null,
      isPending: true,
    }));
    const allRows = [...pendingRows, ...reviewedRows];
  
    body.innerHTML=`
    <div class="page-section">
      <div class="card">
        <div class="card-header"><h3>All Assigned Cases (${allRows.length})</h3></div>
        <div class="card-body card-body-flush">
          ${allRows.length ? `
          <table class="mt-table">
            <thead><tr><th>Case ID</th><th>Patient</th><th>Date</th><th>Status</th><th>My 
Decision</th><th>Action</th></tr></thead>
            <tbody>${allRows.map(c=>`
            <tr>
              <td><strong>${c._id?c._id.slice(-8).toUpperCase():'â€”'}</strong></td>
              <td>${c.patientName}</td>
              <td>${new Date(c.date).toLocaleDateString()}</td>
              <td>${getStatusBadge(c.status)}</td>
              <td>${c.myDecision?getDecisionBadge(c.myDecision):'<span class="badge badge-gray">Pending</span>'}</td>
              <td>
                ${c.isPending?`<button class="btn btn-primary btn-sm" onclick="openDoctorReview('${c._id}')">Review 
â†’</button>`:`<button class="btn btn-outline btn-sm" onclick="viewDoctorCaseReadOnly('${c._id}')">View</button>`}
              </td>
            </tr>`).join('')}</tbody>
          </table>` : `<div style="text-align:center;padding:64px;color:var(--n-400);">No cases assigned yet.</div>`}
        </div>
      </div>
    </div>`;
  }
  
  function renderDoctorProfile(body){
    setTopbar('My Profile','Doctor profile information');
    body.innerHTML=`
    <div class="page-section">
      <div class="profile-avatar-section">
        <div class="profile-avatar">ðŸ‘¨â€âš•ï¸</div>
        <div class="profile-info">
          <h2>Dr. Ramesh Kumar</h2>
          <p>General Physician &nbsp;Â·&nbsp; MCI Reg. No. MCI-2340192 &nbsp;Â·&nbsp; AIIMS Delhi</p>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Professional Information</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Full Name</label><input class="form-control" value="Dr. 
Ramesh Kumar"></div>
            <div class="form-group"><label class="form-label">Specialization</label><input class="form-control" 
value="General Physician"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Experience</label><input class="form-control" value="18 
years"></div>
            <div class="form-group"><label class="form-label">Hospital</label><input class="form-control" value="AIIMS 
Delhi"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Email</label><input class="form-control" 
value="ramesh@hospital.in"></div>
            <div class="form-group"><label class="form-label">Phone</label><input class="form-control" value="+91 
99988 77766"></div>
          </div>
          <div class="form-group"><label class="form-label">MCI Registration Number</label><input class="form-control" 
value="MCI-2340192"></div>
          <button class="btn btn-primary btn-lg" onclick="toast('Profile saved','success')">Save Changes</button>
        </div>
      </div>
    </div>`;
  }
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€ CHIEF DOCTOR PAGES â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  async function renderChiefDashboard(body){
    setTopbar('Chief Doctor Dashboard','Final review & escalation decisions');
    body.innerHTML=`<div class="page-section"><div style="text-align:center;padding:60px;color:var(--n-400);">Loading 
cases...</div></div>`;
  
    const user=getCurrentUser();
    let escalated=[], history=[];
    try {
      const [escData, histData] = await Promise.all([
        api.getConflictCases(),
        api.getChiefCaseHistory(),
      ]);
      escalated = escData.cases||[];
      history = histData.cases||[];
    } catch(err){
      toast(err.message||'Failed to load dashboard','error');
    }
  
    const clearedSafe = history.filter(c=>c.finalRecommendation==='safe').length;
    const revisitCount = history.filter(c=>c.finalRecommendation==='revisit_doctor').length;
  
    body.innerHTML=`
    <div class="page-section">
      <div class="welcome-card">
        <div>
          <h2>Welcome, ${user?.name||'Chief Doctor'}!</h2>
          <p>${escalated.length} case(s) require your final decision.</p>
        </div>
        <div class="wc-badge">
          <div class="wc-badge-val">Chief â˜…</div>
          <div class="wc-badge-label">Senior Reviewer</div>
        </div>
      </div>
      <div class="stat-grid stat-grid-3" style="margin-bottom:22px;">
        <div class="stat-card">
          <div class="stat-icon-wrap si-amber">${ICONS.alert}</div>
          <div class="stat-content">
            <div class="stat-val">${escalated.length}</div>
            <div class="stat-label">Awaiting Decision</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-green">${ICONS.check}</div>
          <div class="stat-content">
            <div class="stat-val">${clearedSafe}</div>
            <div class="stat-label">Cleared Safe</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-red">${ICONS.activity}</div>
          <div class="stat-content">
            <div class="stat-val">${revisitCount}</div>
            <div class="stat-label">Revisit Required</div>
          </div>
        </div>
      </div>
      ${escalated.length > 0 ? `
      <div class="card">
        <div class="card-header"><h3>Escalated Cases</h3></div>
        <div class="card-body card-body-flush">
          <table class="mt-table">
            <thead><tr><th>Case ID</th><th>Patient</th><th>AI Summary</th><th>Action</th></tr></thead>
            <tbody>${escalated.map(c=>`
            <tr>
              <td><strong>${c._id.slice(-8).toUpperCase()}</strong></td>
              <td>${c.patient?.name||'Patient'} (${c.age||'â€”'}, ${c.gender||'â€”'})</td>
              <td>${(c.aiSummary?.synthesis||'').substring(0,60)}...</td>
              <td><button class="btn btn-amber btn-sm" onclick="openChiefReview('${c._id}')">Final Review 
â†’</button></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>` : `
      <div class="card">
        <div class="card-body" style="text-align:center;padding:64px;">
          <div style="width:68px;height:68px;background:var(--c-success-bg);border-radius:50%;display:flex;align-items:
center;justify-content:center;margin:0 auto 18px;color:var(--c-success-dk);">${ICONS.check}</div>
          <h3 style="color:var(--n-800);margin-bottom:8px;font-family:var(--font-heading);">No escalated cases</h3>
          <p style="color:var(--n-400);">All cases have been resolved.</p>
        </div>
      </div>`}
    </div>`;
  }
  
  async function openChiefReview(caseId){
    document.getElementById('modal-title').textContent=`Final Review`;
    document.getElementById('modal-body').innerHTML=`<div 
style="text-align:center;padding:40px;color:var(--n-400);">Loading case...</div>`;
    openModal();
  
    let c, reviews;
    try {
      const data=await api.getCaseForFinalReview(caseId);
      c=data.case;
      reviews=data.reviews||[];
    } catch(err){
      document.getElementById('modal-body').innerHTML=`<div 
style="text-align:center;padding:40px;color:var(--c-danger);">${err.message||'Failed to load case'}</div>`;
      return;
    }
  
    document.getElementById('modal-title').textContent=`Final Review â€“ ${c._id.slice(-8).toUpperCase()}`;
    document.getElementById('modal-body').innerHTML=`
    <div class="detail-section">
      <div class="detail-section-title">Case Overview</div>
      <div class="detail-row"><span class="detail-key">Patient</span><span 
class="detail-val">${c.patient?.name||'Patient'}</span></div>
      <div class="detail-row"><span class="detail-key">Age / Gender</span><span class="detail-val">${c.age||'â€”'} / 
${c.gender||'â€”'}</span></div>
      <div class="detail-row"><span class="detail-key">Symptoms</span><span class="detail-val" 
style="max-width:300px;text-align:right;">${c.symptoms||'â€”'}</span></div>
      <div class="detail-row"><span class="detail-key">Side Effects</span><span 
class="detail-val">${c.sideEffects||'None'}</span></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Prescription</div>
      <div class="rx-image-container">
        ${c.prescriptionFile ? `<img src="http://localhost:5000${c.prescriptionFile}" alt="Prescription">` :
        `<div class="rx-placeholder"><p>No prescription image</p></div>`}
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">AI Synthesis</div>
      <div style="background:var(--brand-blue-lt);padding:13px 
16px;border-radius:var(--r-sm);font-size:13px;color:var(--n-800);border-left:3px solid var(--brand-blue);">
        ${c.aiSummary?.synthesis||'No AI summary available'}
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">All 3 Doctors' Reviews</div>
      ${reviews.map(r=>`
      <div style="background:var(--c-warning-bg);padding:12px 
16px;border-radius:var(--r-sm);font-size:13px;color:var(--n-800);border-left:3px solid 
var(--c-warning);margin-bottom:8px;">
        <strong>${r.doctor?.name||'Doctor'}</strong> (${r.doctor?.specialty||''}) â€” ${getDecisionBadge(r.decision)}
        <p style="margin-top:4px;color:var(--n-700);">${r.reasoning}</p>
      </div>`).join('')}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Your Final Decision</div>
      <div class="decision-options">
        <div class="decision-opt" id="copt-safe" onclick="selectChiefDecision('safe')">
          <div class="decision-opt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="var(--c-success-dk)" 
stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><polyline points="20 6 9 17 4 
12"/></svg></div>
          <div class="decision-opt-label">Safe to Continue</div>
          <div class="decision-opt-desc">Override & clear prescription</div>
        </div>
        <div class="decision-opt" id="copt-revisit" onclick="selectChiefDecision('revisit_doctor')">
          <div class="decision-opt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="var(--c-danger-dk)" 
stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><path d="m21.73 18-8-14a2 2 0 
0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" 
x2="12.01" y2="17"/></svg></div>
          <div class="decision-opt-label">Revisit Doctor</div>
          <div class="decision-opt-desc">Patient must consult again</div>
        </div>
      </div>
      <div class="form-group mt-16">
        <label class="form-label">Chief Doctor Notes</label>
        <textarea class="form-control" id="chiefReason" rows="4" placeholder="Provide your clinical assessment and 
recommendations..."></textarea>
      </div>
      <button class="btn btn-amber btn-full btn-lg" id="submitChiefBtn" onclick="submitChiefReview('${c._id}')">Submit 
Final Decision</button>
    </div>`;
    window._cdDecision=null;
    window.selectChiefDecision=function(d){
      window._cdDecision=d;
      document.getElementById('copt-safe').className='decision-opt'+(d==='safe'?' selected-safe':'');
      document.getElementById('copt-revisit').className='decision-opt'+(d==='revisit_doctor'?' selected-revisit':'');
    };
  }
  
  async function submitChiefReview(caseId){
    const decision=window._cdDecision;
    const summary=document.getElementById('chiefReason').value.trim();
    if(!decision){toast('Please select a final decision','error');return;}
    if(!summary||summary.length<10){toast('Please add clinical notes (at least 10 characters)','error');return;}
  
    const btn=document.getElementById('submitChiefBtn');
    btn.disabled=true;
    btn.textContent='Submitting...';
  
    try {
      await api.submitFinalReview(caseId, { recommendation: decision, summary });
      closeModal();
      toast('Final decision submitted successfully','success');
      renderChiefDashboard(document.getElementById('pageBody'));
    } catch(err){
      toast(err.message||'Failed to submit final review','error');
      btn.disabled=false;
      btn.textContent='Submit Final Decision';
    }
    window._cdDecision=null;
  }
  
  async function renderChiefCases(body){
    setTopbar('Escalated Cases','Cases forwarded for chief doctor review');
    body.innerHTML=`<div class="page-section"><div style="text-align:center;padding:60px;color:var(--n-400);">Loading 
cases...</div></div>`;
  
    let pending=[], history=[];
    try {
      const [pendingData, historyData] = await Promise.all([
        api.getConflictCases(),
        api.getChiefCaseHistory(),
      ]);
      pending = pendingData.cases||[];
      history = historyData.cases||[];
    } catch(err){
      toast(err.message||'Failed to load cases','error');
    }
  
    const rows = [
      ...pending.map(c=>({...c, isPending:true})),
      ...history.map(c=>({...c, isPending:false})),
    ];
  
    body.innerHTML=`
    <div class="page-section">
      <div class="card">
        <div class="card-header"><h3>Escalated Cases (${rows.length})</h3></div>
        <div class="card-body card-body-flush">
          <table class="mt-table">
            <thead><tr><th>Case ID</th><th>Patient</th><th>Final 
Decision</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${rows.length?rows.map(c=>`
            <tr>
              <td><strong>${c._id.slice(-8).toUpperCase()}</strong></td>
              <td>${c.patient?.name||'Patient'}</td>
              <td>${c.finalRecommendation?getDecisionBadge(c.finalRecommendation):'<span class="badge 
badge-gray">Pending</span>'}</td>
              <td>${getStatusBadge(c.status)}</td>
              <td>${c.isPending?`<button class="btn btn-amber btn-sm" onclick="openChiefReview('${c._id}')">Review 
â†’</button>`:`<span style="color:var(--n-400);font-size:12px;">Completed</span>`}</td>
            </tr>`).join(''):`<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--n-400);">No 
escalated cases</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }
  
  function renderChiefProfile(body){
    setTopbar('My Profile','Chief Doctor profile');
    body.innerHTML=`
    <div class="page-section">
      <div class="profile-avatar-section">
        <div class="profile-avatar">ðŸ‘©â€âš•ï¸</div>
        <div class="profile-info">
          <h2>Dr. Sunita Nair</h2>
          <p>Neurologist &nbsp;Â·&nbsp; MCI Reg. No. MCI-1100241 &nbsp;Â·&nbsp; Fortis Hospital</p>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Professional Information</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Full Name</label><input class="form-control" value="Dr. 
Sunita Nair"></div>
            <div class="form-group"><label class="form-label">Designation</label><input class="form-control" 
value="Chief Doctor / Neurologist"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Experience</label><input class="form-control" value="11 
years"></div>
            <div class="form-group"><label class="form-label">Hospital</label><input class="form-control" 
value="Fortis Hospital, Chennai"></div>
          </div>
          <button class="btn btn-amber btn-lg" onclick="toast('Profile saved','success')">Save Changes</button>
        </div>
      </div>
    </div>`;
  }
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€ ADMIN PAGES â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function renderAdminDashboard(body){
    setTopbar('Admin Dashboard','Platform-wide monitoring & analytics');
    const cases=getCases();
    const pending=cases.filter(c=>c.status!=='Completed').length;
    const completed=cases.filter(c=>c.status==='Completed').length;
    const drDone=cases.filter(c=>c.doctorDecision).length;
    const cdDone=cases.filter(c=>c.chiefDecision).length;
  
    body.innerHTML=`
    <div class="page-section">
      <div class="welcome-card">
        <div>
          <h2>MediTrust Control Centre</h2>
          <p>Monitor all prescription review activity across the platform.</p>
        </div>
        <div class="wc-badge">
          <div class="wc-badge-val" style="color:#4ade80;">LIVE</div>
          <div class="wc-badge-label">System Status</div>
        </div>
      </div>
      <div class="stat-grid stat-grid-4" style="margin-bottom:22px;">
        <div class="stat-card">
          <div class="stat-icon-wrap si-blue">${ICONS.folder}</div>
          <div class="stat-content">
            <div class="stat-val">${cases.length}</div>
            <div class="stat-label">Total Cases</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-amber">${ICONS.alert}</div>
          <div class="stat-content">
            <div class="stat-val">${pending}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-green">${ICONS.check}</div>
          <div class="stat-content">
            <div class="stat-val">${completed}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-teal">${ICONS.stethoscope}</div>
          <div class="stat-content">
            <div class="stat-val">${DOCTORS.length}</div>
            <div class="stat-label">Active Doctors</div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="card">
          <div class="card-header"><h3>Recent Activity</h3></div>
          <div class="card-body" style="padding:12px 16px;">
            <div class="admin-activity">
              <div class="activity-item">
                <div class="activity-dot" 
style="background:var(--brand-emerald-lt);color:var(--brand-emerald-dk);">${ICONS.bot}</div>
                <div class="activity-info"><h4>AI analysis completed</h4><p>Case #MT-001 scanned & doctors 
matched</p></div>
                <div class="activity-time">2h ago</div>
              </div>
              <div class="activity-item">
                <div class="activity-dot" 
style="background:var(--c-warning-bg);color:var(--c-warning-dk);">${ICONS.alert}</div>
                <div class="activity-info"><h4>Case escalated</h4><p>Doctor flagged drug interaction in 
#MT-001</p></div>
                <div class="activity-time">5h ago</div>
              </div>
              <div class="activity-item">
                <div class="activity-dot" 
style="background:var(--c-success-bg);color:var(--c-success-dk);">${ICONS.credit}</div>
                <div class="activity-info"><h4>Payment received</h4><p>â‚¹500 for Case #MT-001</p></div>
                <div class="activity-time">6h ago</div>
              </div>
              <div class="activity-item">
                <div class="activity-dot" 
style="background:var(--brand-blue-lt);color:var(--brand-blue);">${ICONS.user}</div>
                <div class="activity-info"><h4>New patient registered</h4><p>Harini S. joined MediTrust</p></div>
                <div class="activity-time">Yesterday</div>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Review Stats</h3></div>
          <div class="card-body">
            <div style="margin-bottom:22px;">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px;">
                <span style="color:var(--n-600);font-weight:600;">Doctor Reviews Completed</span><strong 
style="color:var(--n-900);">${drDone} / ${cases.length}</strong>
              </div>
              <div style="height:8px;background:var(--n-100);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${cases.length?Math.round(drDone/cases.length*100):0}%;background:linear-
gradient(90deg,var(--brand-blue),#10B981);border-radius:4px;transition:.5s;"></div>
              </div>
            </div>
            <div style="margin-bottom:22px;">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px;">
                <span style="color:var(--n-600);font-weight:600;">Chief Doctor Reviews</span><strong 
style="color:var(--n-900);">${cdDone} / ${cases.length}</strong>
              </div>
              <div style="height:8px;background:var(--n-100);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${cases.length?Math.round(cdDone/cases.length*100):0}%;background:linear-
gradient(90deg,var(--c-warning),var(--c-danger));border-radius:4px;transition:.5s;"></div>
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px;">
                <span style="color:var(--n-600);font-weight:600;">Cases Completed</span><strong 
style="color:var(--n-900);">${completed} / ${cases.length}</strong>
              </div>
              <div style="height:8px;background:var(--n-100);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${cases.length?Math.round(completed/cases.length*100):0}%;background:line
ar-gradient(90deg,var(--c-success),#10B981);border-radius:4px;transition:.5s;"></div>
              </div>
            </div>
            <div style="margin-top:26px;padding:20px;background:linear-gradient(135deg,var(--c-success-bg),#F0FDF9);bor
der-radius:var(--r);text-align:center;border:1px solid var(--brand-emerald-lt);">
              <div style="font-family:var(--font-heading);font-size:32px;font-weight:900;color:var(--c-success-dk);lett
er-spacing:-1px;">â‚¹${cases.length * 500}</div>
              <div style="font-size:11px;color:var(--c-success-dk);margin-top:4px;font-weight:700;text-transform:upperc
ase;letter-spacing:0.5px;">Total Revenue</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }
  
  function renderAdminPatients(body){
    setTopbar('Patients','Registered patient accounts');
    body.innerHTML=`
    <div class="page-section">
      <div class="card">
        <div class="card-header"><h3>Registered Patients (1)</h3></div>
        <div class="card-body card-body-flush">
          <table class="mt-table">
            <thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Total Cases</th><th>Last 
Active</th><th>Status</th></tr></thead>
            <tbody>
              <tr>
                <td><div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;border-ra
dius:10px;background:var(--brand-blue-lt);display:flex;align-items:center;justify-content:center;font-size:13px;font-we
ight:800;color:var(--brand-blue);font-family:var(--font-heading);">H</div><div><strong>Harini S.</strong><br><span 
style="font-size:11px;color:var(--n-400);">harini@gmail.com</span></div></div></td>
                <td>28</td>
                <td>Female</td>
                <td><span class="badge badge-blue">${getCases().length} case(s)</span></td>
                <td>Today</td>
                <td><span class="badge badge-green">Active</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }
  
  function renderAdminDoctors(body){
    setTopbar('Doctors','Registered & verified doctors');
    body.innerHTML=`
    <div class="page-section">
      <div class="card">
        <div class="card-header"><h3>Verified Doctors (${DOCTORS.length})</h3></div>
        <div class="card-body card-body-flush">
          <table class="mt-table">
            <thead><tr><th>Doctor</th><th>Specialization</th><th>Hospital</th><th>Experience</th><th>Rating</th><th>Sta
tus</th></tr></thead>
            <tbody>${DOCTORS.map(d=>`
            <tr>
              <td><div style="display:flex;align-items:center;gap:10px;"><span 
style="font-size:22px;">${d.avatar}</span><strong>${d.name}</strong></div></td>
              <td><span class="badge badge-teal">${d.spec}</span></td>
              <td>${d.hosp}</td>
              <td>${d.exp}</td>
              <td style="color:var(--c-warning-dk);font-weight:800;">${d.rating}</td>
              <td><span class="badge badge-green">MCI Verified</span></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }
  
  function renderAdminCases(body){
    setTopbar('All Cases','Complete case management');
    const cases=getCases();
    body.innerHTML=`
    <div class="page-section">
      <div class="card">
        <div class="card-header"><h3>All Cases (${cases.length})</h3></div>
        <div class="card-body card-body-flush">
          <table class="mt-table">
            <thead><tr><th>Case ID</th><th>Patient</th><th>Date</th><th>Status</th><th>Dr. Decision</th><th>Chief 
Decision</th><th>Revenue</th><th>Action</th></tr></thead>
            <tbody>${cases.length?cases.map(c=>`
            <tr>
              <td><strong>${c.id}</strong></td>
              <td>${c.patientName}</td>
              <td>${c.date}</td>
              <td>${getStatusBadge(c.status)}</td>
              <td>${c.doctorDecision?getDecisionBadge(c.doctorDecision):'<span class="badge 
badge-gray">Pending</span>'}</td>
              <td>${c.chiefDecision?getDecisionBadge(c.chiefDecision):'<span class="badge badge-gray">â€”</span>'}</td>
              <td><strong style="color:var(--c-success-dk);">â‚¹500</strong></td>
              <td><button class="btn btn-outline btn-sm" onclick="viewCaseDetails('${c.id}')">View â†’</button></td>
            </tr>`).join(''):`<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--n-400);">No cases 
yet</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }
  
  function renderAdminReports(body){
    setTopbar('Reports','Analytics & insights');
    const cases=getCases();
    body.innerHTML=`
    <div class="page-section">
      <div class="stat-grid stat-grid-4" style="margin-bottom:22px;">
        <div class="stat-card">
          <div class="stat-icon-wrap si-green">${ICONS.chart}</div>
          <div class="stat-content">
            <div class="stat-val">â‚¹${cases.length*500}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-teal">${ICONS.folder}</div>
          <div class="stat-content">
            <div class="stat-val">${cases.length}</div>
            <div class="stat-label">Cases This Month</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-amber">${ICONS.activity}</div>
          <div class="stat-content">
            <div class="stat-val">~24h</div>
            <div class="stat-label">Avg Review Time</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap si-blue">${ICONS.user}</div>
          <div class="stat-content">
            <div class="stat-val">4.8</div>
            <div class="stat-label">Patient Satisfaction</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Platform Summary</h3></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;">
            <div>
              <h4 
style="font-size:13px;font-weight:800;color:var(--n-900);margin-bottom:18px;font-family:var(--font-heading);">Case 
Distribution</h4>
              ${['Doctor Review','Chief Doctor Review','Completed'].map(s=>{
                const n=cases.filter(c=>c.status===s).length;
                const pct=cases.length?Math.round(n/cases.length*100):0;
                const colors={'Doctor Review':'var(--c-warning)','Chief Doctor 
Review':'var(--c-danger)','Completed':'var(--c-success)'};
                return `
                <div style="margin-bottom:18px;">
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:7px;">
                    <span style="color:var(--n-600);font-weight:600;">${s}</span><strong 
style="color:var(--n-900);">${n} (${pct}%)</strong>
                  </div>
                  <div style="height:8px;background:var(--n-100);border-radius:4px;overflow:hidden;">
                    <div 
style="height:100%;width:${pct}%;background:${colors[s]};border-radius:4px;transition:.5s;"></div>
                  </div>
                </div>`;
              }).join('')}
            </div>
            <div>
              <h4 
style="font-size:13px;font-weight:800;color:var(--n-900);margin-bottom:18px;font-family:var(--font-heading);">Doctor 
Performance</h4>
              ${DOCTORS.map(d=>`
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <span style="font-size:20px;flex-shrink:0;">${d.avatar}</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:12px;font-weight:700;color:var(--n-800);white-space:nowrap;overflow:hidden;text
-overflow:ellipsis;">${d.name}</div>
                  <div style="height:6px;background:var(--n-100);border-radius:3px;margin-top:6px;overflow:hidden;">
                    <div style="height:100%;width:${Math.floor(Math.random()*40+60)}%;background:linear-gradient(90deg,
var(--brand-blue),#10B981);border-radius:3px;"></div>
                  </div>
                </div>
                <span 
style="font-size:12px;color:var(--c-warning-dk);font-weight:800;flex-shrink:0;">${d.rating}</span>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SHARED HELPERS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function setTopbar(title, subtitle){
    document.getElementById('topbar-title').textContent=title;
    document.getElementById('topbar-subtitle').textContent=subtitle;
  }
  
  function getStatusBadge(status){
    const map={
      'draft':{cls:'badge-gray',label:'Draft'},
      'pending_payment':{cls:'badge-amber',label:'Pending Payment'},
      'pending_review':{cls:'badge-amber',label:'Pending Review'},
      'in_review':{cls:'badge-amber',label:'Doctor Review'},
      'conflict':{cls:'badge-red',label:'Chief Doctor Review'},
      'chief_review':{cls:'badge-red',label:'Chief Doctor Review'},
      'completed':{cls:'badge-green',label:'Completed'},
      'cancelled':{cls:'badge-gray',label:'Cancelled'}
    };
    const s=map[status]||{cls:'badge-gray',label:status};
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  }
  
  function getDecisionBadge(decision){
    if(decision==='safe') return '<span class="badge badge-green">Safe to Continue</span>';
    if(decision==='revisit_doctor') return '<span class="badge badge-red">Revisit Doctor</span>';
    return `<span class="badge badge-gray">${decision}</span>`;
  }
  
  async function viewCaseDetails(caseId){
    document.getElementById('modal-title').textContent=`Case Details`;
    document.getElementById('modal-body').innerHTML=`<div 
style="text-align:center;padding:40px;color:var(--n-400);">Loading case details...</div>`;
    openModal();
  
    let c;
    try {
      const data=await api.getCaseById(caseId);
      c=data.case;
    } catch(err){
      document.getElementById('modal-body').innerHTML=`<div 
style="text-align:center;padding:40px;color:var(--c-danger);">${err.message||'Failed to load case'}</div>`;
      return;
    }
  
    document.getElementById('modal-title').textContent=`Case Details â€“ ${c._id.slice(-8).toUpperCase()}`;
    const createdDate=new Date(c.createdAt).toLocaleDateString();
  
    document.getElementById('modal-body').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="detail-section">
        <div class="detail-section-title">Patient Info</div>
        <div class="detail-row"><span class="detail-key">Age</span><span class="detail-val">${c.age||'â€”'} 
yrs</span></div>
        <div class="detail-row"><span class="detail-key">Gender</span><span 
class="detail-val">${c.gender||'â€”'}</span></div>
        <div class="detail-row"><span class="detail-key">Date</span><span 
class="detail-val">${createdDate}</span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Review Status</div>
        <div class="detail-row"><span class="detail-key">Status</span><span 
class="detail-val">${getStatusBadge(c.status)}</span></div>
        <div class="detail-row"><span class="detail-key">Final Recommendation</span><span 
class="detail-val">${c.finalRecommendation?getDecisionBadge(c.finalRecommendation):'Pending'}</span></div>
        <div class="detail-row"><span class="detail-key">Payment</span><span class="detail-val"><span class="badge 
${c.paymentStatus==='paid'?'badge-green':'badge-gray'}">â‚¹500 
${c.paymentStatus==='paid'?'Paid':'Pending'}</span></span></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Symptoms</div>
      <p style="font-size:13px;color:var(--n-700);line-height:1.7;">${c.symptoms||'â€”'}</p>
      ${c.sideEffects?`<p style="font-size:12px;color:var(--n-400);margin-top:6px;">Side effects: 
${c.sideEffects}</p>`:''}
    </div>
    ${c.prescriptionFile?`
    <div class="detail-section">
      <div class="detail-section-title">Prescription</div>
      <div class="rx-image-container">
        <img src="http://localhost:5000${c.prescriptionFile}" alt="Prescription">
      </div>
    </div>`:''}
    ${c.ocrResult&&c.ocrResult.medicines&&c.ocrResult.medicines.length?`
    <div class="detail-section">
      <div class="detail-section-title">Medicines Detected (OCR)</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${c.ocrResult.medicines.map(m=>`<span class="chip">${m}</span>`).join('')}
      </div>
    </div>`:''}


