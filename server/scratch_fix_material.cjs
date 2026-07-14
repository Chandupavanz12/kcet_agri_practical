const fs = require('fs');

function fixFiles() {
  const files = ['src/controllers/admin.mysql.controller.js', 'src/controllers/student.mysql.controller.js'];
  for (const f of files) {
    let code = fs.readFileSync(f, 'utf8');
    
    // Add import if missing
    if (!code.includes('getMaterialModel')) {
      code = code.replace(/Material,/, 'Material,\n  getMaterialModel,');
    }

    // Safely replace methods
    const methods = ['find', 'updateOne', 'deleteOne', 'findOne', 'create', 'save', 'countDocuments', 'aggregate', 'insertMany', 'deleteMany'];
    for (const m of methods) {
      const regex = new RegExp(`Material\\.${m}(?!\\w)`, 'g');
      code = code.replace(regex, `(await getMaterialModel()).${m}`);
    }

    // Replace constructor
    code = code.replace(/new Material\(/g, 'new (await getMaterialModel())(');

    fs.writeFileSync(f, code);
  }
}

fixFiles();
console.log('Fixed Material usages.');
