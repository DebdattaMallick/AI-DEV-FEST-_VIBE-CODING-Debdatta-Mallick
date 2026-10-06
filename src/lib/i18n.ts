export type Language = 'en' | 'bn';

export interface Translations {
  appName: string;
  appSubtitle: string;
  loadRequirementsBtn: string;
  loadSampleBtn: string;
  languageEn: string;
  languageBn: string;

  // Tender Card
  tenderDetailsTitle: string;
  tenderId: string;
  tenderTitle: string;
  procuringEntity: string;
  bidder: string;
  submissionDeadline: string;
  totalRequirements: string;
  mandatoryRequirements: string;
  optionalRequirements: string;
  noTenderLoadedTitle: string;
  noTenderLoadedSubtitle: string;

  // Step 1: Upload
  step1Title: string;
  step1Subtitle: string;
  dropFilesHere: string;
  chooseFilesBtn: string;
  limitsNotice: string;
  currentUploadedFiles: string;
  totalSize: string;
  noFilesUploaded: string;
  pageCount: string;
  fileSize: string;
  hashPreview: string;
  previewBtn: string;
  removeBtn: string;
  duplicateBadge: string;
  duplicateOf: string;
  removeThisCopyBtn: string;
  fileNotUsed: string;
  fileUsedFor: string;

  // Step 2: Checklist & Matching
  step2Title: string;
  step2Subtitle: string;
  orderCol: string;
  documentCol: string;
  attachedFileCol: string;
  expiryDateCol: string;
  statusCol: string;
  actionsCol: string;
  mandatoryBadge: string;
  optionalBadge: string;
  noFileSelected: string;
  clearMatchBtn: string;
  undoBtn: string;
  redoBtn: string;
  datePlaceholder: string;
  expiryDateLabel: string;
  dateInvalidTooltip: string;
  alreadyUsedFor: string;
  sameContentUsedFor: string;
  emptyRequirementsSubtitle: string;

  // Statuses
  statusMissing: string;
  statusExpiryNeeded: string;
  statusExpired: string;
  statusNotProvided: string;
  statusOk: string;

  // Step 3: Summary & Generate
  step3Title: string;
  step3Subtitle: string;
  readyStatusSummary: string;
  blockingIssuesCount: string;
  blockingIssuesTitle: string;
  clickToJump: string;
  generatePackageBtn: string;
  generatingPackage: string;
  packageReadyTitle: string;
  downloadPackageBtn: string;
  previewPackageBtn: string;
  packageStaleWarning: string;
  reGenerateBtn: string;
  summaryStatusMissing: string;
  summaryStatusExpiryNeeded: string;
  summaryStatusExpired: string;
  summaryStatusNotProvided: string;
  summaryStatusOk: string;

  // Modals & Dialogs
  previewModalTitle: string;
  closeBtn: string;
  pageNavigation: string;
  zoomIn: string;
  zoomOut: string;
  fitWidth: string;
  confirmModalTitle: string;
  confirmBtn: string;
  cancelBtn: string;
  confirmRemoveFileTitle: string;
  confirmRemoveFileMsg: string;
  confirmNewTenderTitle: string;
  confirmNewTenderMsg: string;

  // Messages & Errors
  notificationsTitle: string;
  dismissBtn: string;
  tenderLoadedSuccess: string;
  fileAccepted: string;
}

export const i18nDict: Record<Language, Translations> = {
  en: {
    appName: 'Tender Document Package Builder',
    appSubtitle: 'Official Tender Submission PDF Assembly & Validation Engine',
    loadRequirementsBtn: 'Open requirements.json',
    loadSampleBtn: 'Load Sample Tender',
    languageEn: 'English',
    languageBn: 'বাংলা',

    // Tender Card
    tenderDetailsTitle: 'Active Tender Details',
    tenderId: 'Tender ID',
    tenderTitle: 'Tender Title',
    procuringEntity: 'Procuring Entity',
    bidder: 'Bidder',
    submissionDeadline: 'Submission Deadline',
    totalRequirements: 'Total Requirements',
    mandatoryRequirements: 'Mandatory',
    optionalRequirements: 'Optional',
    noTenderLoadedTitle: 'No Tender Loaded Yet',
    noTenderLoadedSubtitle: 'Please open or drag-and-drop a requirements.json file to get started.',

    // Step 1: Upload
    step1Title: 'STEP 1: Upload PDF Files',
    step1Subtitle: 'Upload bid documents (PDFs only, maximum 30 files, 50 MB total)',
    dropFilesHere: 'Drag & drop tender PDF files here or click to browse',
    chooseFilesBtn: 'Choose PDF Files',
    limitsNotice: 'Max 30 files & 50 MB total. Only genuine PDF documents are accepted.',
    currentUploadedFiles: 'Uploaded Documents',
    totalSize: 'Total Size',
    noFilesUploaded: 'No PDF files uploaded yet. Add files above to begin matching.',
    pageCount: 'pages',
    fileSize: 'Size',
    hashPreview: 'SHA-256',
    previewBtn: 'Preview',
    removeBtn: 'Remove',
    duplicateBadge: 'Duplicate',
    duplicateOf: 'Duplicate of',
    removeThisCopyBtn: 'Remove this copy',
    fileNotUsed: 'Not used in package',
    fileUsedFor: 'Matched to',

    // Step 2: Checklist
    step2Title: 'STEP 2: Match Documents & Enter Expiry Dates',
    step2Subtitle: 'Assign uploaded files to the required document checklist in exact submission order',
    orderCol: '#',
    documentCol: 'Required Document',
    attachedFileCol: 'Matched PDF File',
    expiryDateCol: 'Expiry Date',
    statusCol: 'Validation Status',
    actionsCol: 'Action',
    mandatoryBadge: 'Mandatory',
    optionalBadge: 'Optional',
    noFileSelected: '— no file —',
    clearMatchBtn: 'Clear Match',
    undoBtn: 'Undo',
    redoBtn: 'Redo',
    datePlaceholder: 'YYYY-MM-DD',
    expiryDateLabel: 'Expiry Date',
    dateInvalidTooltip: 'Enter valid calendar date (YYYY-MM-DD)',
    alreadyUsedFor: 'already used for',
    sameContentUsedFor: 'same content as',
    emptyRequirementsSubtitle: 'Load requirements.json above to populate this document checklist.',

    // Statuses
    statusMissing: 'Missing',
    statusExpiryNeeded: 'Expiry date needed',
    statusExpired: 'Expired',
    statusNotProvided: 'Not provided',
    statusOk: 'OK',

    // Step 3: Summary
    step3Title: 'STEP 3: Check & Make Package',
    step3Subtitle: 'Review checklist compliance and generate the final unified submission PDF',
    readyStatusSummary: 'required documents ready',
    blockingIssuesCount: 'blocking issue(s) require resolution',
    blockingIssuesTitle: 'Blocking Issues (Click to jump):',
    clickToJump: 'Click to scroll to this document',
    generatePackageBtn: 'Generate Package',
    generatingPackage: 'Generating package...',
    packageReadyTitle: 'Submission Package Ready',
    downloadPackageBtn: 'Download Package',
    previewPackageBtn: 'Preview Generated PDF',
    packageStaleWarning: 'Changes made after generation. Re-generate to update package.',
    reGenerateBtn: 'Re-generate Package',
    summaryStatusMissing: 'Missing (Mandatory)',
    summaryStatusExpiryNeeded: 'Expiry Date Needed',
    summaryStatusExpired: 'Expired (Past Deadline)',
    summaryStatusNotProvided: 'Optional Not Provided',
    summaryStatusOk: 'Verified & Ready (OK)',

    // Modals
    previewModalTitle: 'Document Viewer',
    closeBtn: 'Close',
    pageNavigation: 'Page',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fitWidth: 'Fit Width',
    confirmModalTitle: 'Confirm Action',
    confirmBtn: 'Confirm',
    cancelBtn: 'Cancel',
    confirmRemoveFileTitle: 'Remove File?',
    confirmRemoveFileMsg: 'Are you sure you want to remove this file? Any matched requirement and expiry date will be cleared.',
    confirmNewTenderTitle: 'Load New Requirements File?',
    confirmNewTenderMsg: 'Loading a new requirements file will keep your uploaded files, but reset all current document matches and expiry dates. Continue?',

    // Messages
    notificationsTitle: 'Notice & Alerts',
    dismissBtn: 'Dismiss',
    tenderLoadedSuccess: 'Requirements loaded successfully.',
    fileAccepted: 'file(s) accepted.',
  },

  bn: {
    appName: 'টেন্ডার ডকুমেন্ট প্যাকেজ বিল্ডার',
    appSubtitle: 'সরকারি টেন্ডার দাখিলের স্বয়ংক্রিয় PDF সংকলন ও যাচাইকরণ ব্যবস্থা',
    loadRequirementsBtn: 'requirements.json খুলুন',
    loadSampleBtn: 'নমুনা টেন্ডার লোড করুন',
    languageEn: 'English',
    languageBn: 'বাংলা',

    // Tender Card
    tenderDetailsTitle: 'চলতি টেন্ডার বিবরণী',
    tenderId: 'টেন্ডার আইডি',
    tenderTitle: 'টেন্ডারের শিরোনাম',
    procuringEntity: 'ক্রয়কারী সংস্থা',
    bidder: 'দরদাতা',
    submissionDeadline: 'জমার শেষ তারিখ',
    totalRequirements: 'মোট প্রয়োজনীয় নথি',
    mandatoryRequirements: 'বাধ্যতামূলক',
    optionalRequirements: 'ঐচ্ছিক',
    noTenderLoadedTitle: 'এখনও কোনো টেন্ডার লোড করা হয়নি',
    noTenderLoadedSubtitle: 'শুরু করতে অনুগ্রহ করে একটি requirements.json ফাইল খুলুন বা ড্র্যাগ করে ফেলুন।',

    // Step 1: Upload
    step1Title: 'ধাপ ১: PDF ফাইল আপলোড করুন',
    step1Subtitle: 'দরপত্রের নথি আপলোড করুন (কেবল PDF, সর্বোচ্চ ৩০টি ফাইল, ৫০ মেগাবাইট)',
    dropFilesHere: 'এখানে PDF ফাইল টেনে এনে ফেলুন অথবা ব্রাউজ করতে ক্লিক করুন',
    chooseFilesBtn: 'ফাইল নির্বাচন করুন',
    limitsNotice: 'সর্বোচ্চ ৩০টি ফাইল ও মোট ৫০ মেগাবাইট। কেবল সঠিক PDF নথি গৃহীত হবে।',
    currentUploadedFiles: 'আপলোডকৃত নথি',
    totalSize: 'মোট সাইজ',
    noFilesUploaded: 'এখনও কোনো PDF ফাইল আপলোড করা হয়নি। ম্যাচিং শুরু করতে উপরে ফাইল যোগ করুন।',
    pageCount: 'পৃষ্ঠা',
    fileSize: 'আকার',
    hashPreview: 'SHA-256',
    previewBtn: 'প্রিভিউ',
    removeBtn: 'সরিয়ে ফেলুন',
    duplicateBadge: 'ডুপ্লিকেট',
    duplicateOf: 'এর ডুপ্লিকেট',
    removeThisCopyBtn: 'এই কপিটি সরান',
    fileNotUsed: 'প্যাকেজে ব্যবহৃত হয়নি',
    fileUsedFor: 'সংযুক্ত নথি',

    // Step 2: Checklist
    step2Title: 'ধাপ ২: প্রতিটি ফাইল নির্দিষ্ট নথির সাথে ম্যাচ করুন ও মেয়াদের তারিখ লিখুন',
    step2Subtitle: 'নির্দিষ্ট ক্রম অনুসারে প্রতিটি প্রয়োজনীয় নথির সাথে সংশ্লিষ্ট PDF ফাইল সংযুক্ত করুন',
    orderCol: '#',
    documentCol: 'প্রয়োজনীয় নথি',
    attachedFileCol: 'সংযুক্ত PDF ফাইল',
    expiryDateCol: 'মেয়াদ শেষের তারিখ',
    statusCol: 'যাচাইকরণের অবস্থা',
    actionsCol: 'পদক্ষেপ',
    mandatoryBadge: 'বাধ্যতামূলক',
    optionalBadge: 'ঐচ্ছিক',
    noFileSelected: '— কোনো ফাইল নেই —',
    clearMatchBtn: 'ম্যাচ বাতিল করুন',
    undoBtn: 'পূর্বাবস্থায় ফেরান',
    redoBtn: 'পুনরায় করুন',
    datePlaceholder: 'YYYY-MM-DD',
    expiryDateLabel: 'মেয়াদ শেষের তারিখ',
    dateInvalidTooltip: 'সঠিক ক্যালেন্ডার তারিখ লিখুন (YYYY-MM-DD)',
    alreadyUsedFor: 'ইতিমধ্যে ব্যবহৃত হয়েছে',
    sameContentUsedFor: 'একই ফাইল ব্যবহৃত হয়েছে',
    emptyRequirementsSubtitle: 'নথির তালিকা দেখতে উপরে requirements.json ফাইলটি লোড করুন।',

    // Statuses
    statusMissing: 'অনুপস্থিত',
    statusExpiryNeeded: 'মেয়াদের তারিখ প্রয়োজন',
    statusExpired: 'মেয়াদোত্তীর্ণ',
    statusNotProvided: 'প্রদান করা হয়নি',
    statusOk: 'ঠিক আছে',

    // Step 3: Summary
    step3Title: 'ধাপ ৩: যাচাই করুন ও প্যাকেজ তৈরি করুন',
    step3Subtitle: 'নথির সঠিকতা যাচাই করে চূড়ান্ত একত্রিত টেন্ডার প্যাকেজ PDF তৈরি করুন',
    readyStatusSummary: 'প্রয়োজনীয় নথি প্রস্তুত',
    blockingIssuesCount: 'টি বাধা বা সমস্যা সংশোধন প্রয়োজন',
    blockingIssuesTitle: 'সংশোধনযোগ্য সমস্যা (ক্লিক করে নথিতে যান):',
    clickToJump: 'এই নথির সারিতে যেতে ক্লিক করুন',
    generatePackageBtn: 'প্যাকেজ তৈরি করুন',
    generatingPackage: 'প্যাকেজ তৈরি হচ্ছে...',
    packageReadyTitle: 'দাখিল প্যাকেজ প্রস্তুত',
    downloadPackageBtn: 'ডাউনলোড করুন',
    previewPackageBtn: 'তৈরিকৃত PDF প্রিভিউ করুন',
    packageStaleWarning: 'প্যাকেজ তৈরির পর পরিবর্তন করা হয়েছে। নতুন প্যাকেজ তৈরি করুন।',
    reGenerateBtn: 'পুনরায় প্যাকেজ তৈরি করুন',
    summaryStatusMissing: 'অনুপস্থিত (বাধ্যতামূলক)',
    summaryStatusExpiryNeeded: 'মেয়াদের তারিখ প্রয়োজন',
    summaryStatusExpired: 'মেয়াদোত্তীর্ণ (জমার সময় পার)',
    summaryStatusNotProvided: 'ঐচ্ছিক নথি দেওয়া হয়নি',
    summaryStatusOk: 'যাচাইকৃত ও প্রস্তুত (ঠিক আছে)',

    // Modals
    previewModalTitle: 'নথি প্রদর্শক (প্রিভিউ)',
    closeBtn: 'বন্ধ করুন',
    pageNavigation: 'পৃষ্ঠা',
    zoomIn: 'বড় করুন',
    zoomOut: 'ছোট করুন',
    fitWidth: 'প্রস্থ অনুযায়ী',
    confirmModalTitle: 'নিশ্চিত করুন',
    confirmBtn: 'হ্যাঁ, নিশ্চিত',
    cancelBtn: 'বাতিল',
    confirmRemoveFileTitle: 'ফাইলটি সরিয়ে ফেলবেন?',
    confirmRemoveFileMsg: 'আপনি কি নিশ্চিত যে এই ফাইলটি সরাতে চান? সংশ্লিষ্ট নথির ম্যাচ এবং মেয়াদের তারিখ মুছে ফেলা হবে।',
    confirmNewTenderTitle: 'নতুন requirements ফাইল লোড করবেন?',
    confirmNewTenderMsg: 'নতুন ফাইল লোড করলে আপনার আপলোড করা ফাইলগুলো থাকবে, তবে বর্তমান ম্যাচ এবং মেয়াদের তারিখগুলো রিসেট হবে। এগিয়ে যেতে চান?',

    // Messages
    notificationsTitle: 'বিজ্ঞপ্তি ও সতর্কতা',
    dismissBtn: 'মুছে ফেলুন',
    tenderLoadedSuccess: 'requirements ফাইল সফলভাবে লোড হয়েছে।',
    fileAccepted: 'টি ফাইল গৃহীত হয়েছে।',
  },
};
