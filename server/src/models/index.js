import mongoose from 'mongoose';

const { Schema } = mongoose;

const CounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { collection: 'counters' }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

async function getNextId(sequenceName) {
  const doc = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return Number(doc.seq);
}

function withNumericId(schema, sequenceName) {
  schema.add({
    id: { type: Number, unique: true, index: true },
  });

  schema.pre('save', async function preSave() {
    if (!this.isNew) return;
    if (Number.isFinite(this.id)) return;
    this.id = await getNextId(sequenceName);
  });

  return schema;
}

const UserSchema = withNumericId(
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
      password_hash: { type: String, required: true },
      role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
      created_at: { type: Date, default: () => new Date() },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'users' }
  ),
  'users'
);

UserSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const SettingsSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    videos_enabled: { type: Boolean, default: true },
    tests_enabled: { type: Boolean, default: true },
    pdfs_enabled: { type: Boolean, default: true },
    pyqs_enabled: { type: Boolean, default: true },
    notifications_enabled: { type: Boolean, default: true },
    created_at: { type: Date, default: () => new Date() },
    updated_at: { type: Date, default: () => new Date() },
  },
  { collection: 'settings' }
);

SettingsSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

const PlanSchema = withNumericId(
  new Schema(
    {
      code: { type: String, required: true, trim: true, lowercase: true },
      name: { type: String, required: true, trim: true },
      price_paise: { type: Number, required: true, default: 0 },
      duration_days: { type: Number, required: true, default: 365 },
      status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
      is_free: { type: Boolean, default: false },
      created_at: { type: Date, default: () => new Date() },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'plans' }
  ),
  'plans'
);

PlanSchema.index({ code: 1 }, { unique: true });
PlanSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

const PaymentSchema = withNumericId(
  new Schema(
    {
      user_id: { type: Number, required: true, index: true },
      plan_id: { type: Number, required: true, index: true },
      amount_paise: { type: Number, required: true, default: 0 },
      status: { type: String, default: 'pending', index: true },
      razorpay_order_id: { type: String },
      razorpay_payment_id: { type: String },
      razorpay_signature: { type: String },
      created_at: { type: Date, default: () => new Date(), index: true },
      updated_at: { type: Date, default: () => new Date() },
      paid_at: { type: Date, default: null },
    },
    { collection: 'payments' }
  ),
  'payments'
);

PaymentSchema.index({ razorpay_order_id: 1 }, { unique: true, sparse: true });
PaymentSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

const UserAccessSchema = withNumericId(
  new Schema(
    {
      user_id: { type: Number, required: true, unique: true, index: true },
      combo_access: { type: Boolean, default: false },
      expiry: { type: Date, default: null },
      pyq_access: { type: Boolean, default: false },
      pyq_expiry: { type: Date, default: null },
      material_access: { type: Boolean, default: false },
      material_expiry: { type: Date, default: null },
      created_at: { type: Date, default: () => new Date() },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'user_access' }
  ),
  'user_access'
);

UserAccessSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const UserAccess = mongoose.models.UserAccess || mongoose.model('UserAccess', UserAccessSchema);

const MenuSchema = withNumericId(
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      route: { type: String, default: null },
      icon: { type: String, default: '📄' },
      resource_type: { type: String, default: 'link' },
      type: { type: String, default: 'student' },
      status: { type: String, default: 'active', index: true },
      menu_order: { type: Number, default: 0 },
      parent_id: { type: Number, default: null, index: true },
      created_at: { type: Date, default: () => new Date() },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'menus' }
  ),
  'menus'
);

MenuSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Menu = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);

const VideoSchema = withNumericId(
  new Schema(
    {
      title: { type: String, required: true, trim: true },
      video_url: { type: String, required: true, trim: true },
      thumbnail_url: { type: String, default: null },
      subject: { type: String, required: true, default: 'General' },
      duration: { type: Number, default: null },
      status: { type: String, default: 'active', index: true },
      created_at: { type: Date, default: () => new Date(), index: true },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'videos' }
  ),
  'videos'
);

VideoSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Video = mongoose.models.Video || mongoose.model('Video', VideoSchema);

const MaterialSchema = withNumericId(
  new Schema(
    {
      title: { type: String, required: true, trim: true },
      description: { type: String, default: null },
      pdf_url: { type: String, required: true, trim: true },
      subject: { type: String, required: true, default: 'General' },
      type: { type: String, default: 'pdf', index: true },
      access_type: { type: String, enum: ['free', 'paid'], default: 'free', index: true },
      status: { type: String, default: 'active', index: true },
      menu_id: { type: Number, default: null, index: true },
      created_at: { type: Date, default: () => new Date(), index: true },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'materials' }
  ),
  'materials'
);

MaterialSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);

const ExamCentreSchema = withNumericId(
  new Schema(
    {
      name: { type: String, required: true, trim: true, unique: true, index: true },
      status: { type: String, default: 'active', index: true },
      created_at: { type: Date, default: () => new Date() },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'exam_centres' }
  ),
  'exam_centres'
);

ExamCentreSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const ExamCentre = mongoose.models.ExamCentre || mongoose.model('ExamCentre', ExamCentreSchema);

const ExamCentreYearSchema = withNumericId(
  new Schema(
    {
      centre_id: { type: Number, required: true, index: true },
      year: { type: String, required: true, trim: true, index: true },
      status: { type: String, default: 'active', index: true },
      created_at: { type: Date, default: () => new Date() },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'exam_centre_years' }
  ),
  'exam_centre_years'
);

ExamCentreYearSchema.index({ centre_id: 1, year: 1 }, { unique: true });
ExamCentreYearSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const ExamCentreYear = mongoose.models.ExamCentreYear || mongoose.model('ExamCentreYear', ExamCentreYearSchema);

const PyqSchema = withNumericId(
  new Schema(
    {
      title: { type: String, required: true, trim: true },
      pdf_url: { type: String, required: true, trim: true },
      solution_url: { type: String, default: null },
      subject: { type: String, default: 'General' },
      year: { type: String, required: true, trim: true, index: true },
      centre_id: { type: Number, required: true, index: true },
      access_type: { type: String, enum: ['free', 'paid'], default: 'paid', index: true },
      status: { type: String, default: 'active', index: true },
      created_at: { type: Date, default: () => new Date(), index: true },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'pyqs' }
  ),
  'pyqs'
);

PyqSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Pyq = mongoose.models.Pyq || mongoose.model('Pyq', PyqSchema);

const NotificationSchema = withNumericId(
  new Schema(
    {
      title: { type: String, required: true, trim: true },
      message: { type: String, required: true },
      status: { type: String, default: 'active', index: true },
      created_at: { type: Date, default: () => new Date(), index: true },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'notifications' }
  ),
  'notifications'
);

NotificationSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

const UserNotificationSchema = withNumericId(
  new Schema(
    {
      user_id: { type: Number, required: true, index: true },
      title: { type: String, required: true, trim: true },
      message: { type: String, required: true },
      status: { type: String, default: 'unread', index: true },
      created_at: { type: Date, default: () => new Date(), index: true },
    },
    { collection: 'user_notifications' }
  ),
  'user_notifications'
);

const UserNotification = mongoose.models.UserNotification || mongoose.model('UserNotification', UserNotificationSchema);

const PasswordResetSchema = withNumericId(
  new Schema(
    {
      user_id: { type: Number, required: true, index: true },
      token: { type: String, required: true, index: true },
      expires_at: { type: Date, required: true, index: true },
      used_at: { type: Date, default: null, index: true },
      created_at: { type: Date, default: () => new Date(), index: true },
    },
    { collection: 'password_resets' }
  ),
  'password_resets'
);

PasswordResetSchema.index({ user_id: 1, token: 1 }, { unique: true });
const PasswordReset = mongoose.models.PasswordReset || mongoose.model('PasswordReset', PasswordResetSchema);

const LoginOtpSchema = withNumericId(
  new Schema(
    {
      user_id: { type: Number, required: true, index: true },
      token: { type: String, required: true, index: true },
      expires_at: { type: Date, required: true, index: true },
      used_at: { type: Date, default: null, index: true },
      created_at: { type: Date, default: () => new Date(), index: true },
    },
    { collection: 'login_otps' }
  ),
  'login_otps'
);

LoginOtpSchema.index({ user_id: 1, token: 1 }, { unique: true });
const LoginOtp = mongoose.models.LoginOtp || mongoose.model('LoginOtp', LoginOtpSchema);

const SpecimenSchema = withNumericId(
  new Schema(
    {
      image_url: { type: String, required: true },
      options_json: { type: String, required: true },
      correct: { type: Number, required: true },
      status: { type: String, default: 'active', index: true },
      question_text: { type: String, default: null },
      created_at: { type: Date, default: () => new Date(), index: true },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'specimens' }
  ),
  'specimens'
);

SpecimenSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Specimen = mongoose.models.Specimen || mongoose.model('Specimen', SpecimenSchema);

const TestSchema = withNumericId(
  new Schema(
    {
      title: { type: String, required: true },
      is_active: { type: Boolean, default: true, index: true },
      question_count: { type: Number, default: 0 },
      per_question_seconds: { type: Number, default: 30 },
      marks_correct: { type: Number, default: 4 },
      created_at: { type: Date, default: () => new Date(), index: true },
      updated_at: { type: Date, default: () => new Date() },
    },
    { collection: 'tests' }
  ),
  'tests'
);

TestSchema.pre('save', function touchUpdatedAt() {
  this.updated_at = new Date();
});

const Test = mongoose.models.Test || mongoose.model('Test', TestSchema);

const TestQuestionSchema = withNumericId(
  new Schema(
    {
      test_id: { type: Number, required: true, index: true },
      question_text: { type: String, required: true },
      image_url: { type: String, required: true },
      option_a: { type: String, required: true },
      option_b: { type: String, required: true },
      option_c: { type: String, required: true },
      option_d: { type: String, required: true },
      correct_option: { type: String, required: true },
      question_order: { type: Number, default: 1, index: true },
      created_at: { type: Date, default: () => new Date() },
    },
    { collection: 'test_questions' }
  ),
  'test_questions'
);

TestQuestionSchema.index({ test_id: 1, question_order: 1 });
const TestQuestion = mongoose.models.TestQuestion || mongoose.model('TestQuestion', TestQuestionSchema);

const ResultSchema = withNumericId(
  new Schema(
    {
      user_id: { type: Number, required: true, index: true },
      test_id: { type: Number, required: true, index: true },
      score: { type: Number, required: true },
      correct_count: { type: Number, required: true },
      wrong_count: { type: Number, required: true },
      total_questions: { type: Number, required: true },
      accuracy: { type: Number, required: true },
      time_taken_sec: { type: Number, required: true },
      responses_json: { type: String, required: true },
      date: { type: Date, default: () => new Date(), index: true },
      created_at: { type: Date, default: () => new Date() },
    },
    { collection: 'results' }
  ),
  'results'
);

ResultSchema.index({ test_id: 1, score: -1, time_taken_sec: 1, date: 1 });
const Result = mongoose.models.Result || mongoose.model('Result', ResultSchema);

const MaterialCompletionSchema = withNumericId(
  new Schema(
    {
      user_id: { type: Number, required: true, index: true },
      material_id: { type: Number, required: true, index: true },
      created_at: { type: Date, default: () => new Date(), index: true },
    },
    { collection: 'material_completions' }
  ),
  'material_completions'
);

MaterialCompletionSchema.index({ user_id: 1, material_id: 1 }, { unique: true });
const MaterialCompletion =
  mongoose.models.MaterialCompletion || mongoose.model('MaterialCompletion', MaterialCompletionSchema);

export {
  Counter,
  User,
  Settings,
  Plan,
  Payment,
  UserAccess,
  Menu,
  Video,
  Material,
  ExamCentre,
  ExamCentreYear,
  Pyq,
  Notification,
  UserNotification,
  PasswordReset,
  LoginOtp,
  Specimen,
  Test,
  TestQuestion,
  Result,
  MaterialCompletion,
};
