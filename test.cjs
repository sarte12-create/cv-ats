const fs = require('fs');
const key = "AIzaSyDOECoGIYEjzenOl3bF_b0z6BhluzCNrvw";
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  .then(res => res.json())
  .then(data => {
      if(!data.models) {
          fs.writeFileSync('models.txt', JSON.stringify(data));
          return;
      }
      const models = data.models.map(m => m.name.replace('models/', ''));
      fs.writeFileSync('models.txt', models.join('\n'));
  });
