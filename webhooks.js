const express = require('express')
const bodyParser = require('body-parser')
const exec = require('child_process').exec
const async = require('async')

const app = express()
const port = 6666

class WebHookHandler {
  constructor(data) {
    this.data = data;

    this.allowedRepos = [{
      // watch for pushs on this branch
      branch: 'master', 
      
      // full name of repository
      name: 'user/repository', 
      
      // git repos path on server
      reposPath: 'repository_path', 
      
      // webserver path on server
      deployPath: 'deploy_path', 
      
      // list of commands to be executed, i let my list for example
      commands: ['git pull', 'gulp build', 'rm -rf [$deployPath]/*', 'cp -rf ./dist/* [$deployPath]'], 
    }];
    this.deploy();
  }

  checkEvent() {
    return (this.data.hasOwnProperty('push') && this.data.hasOwnProperty('repository'));
  }

  checkRepos() {
    let test = this.allowedRepos.filter((item, i) => {
      return item.name === this.data.repository.full_name && item.branch === this.data.push.changes[0].new.name
    })

    return (test.length === 1)
  }

  getRepoData() {
    return this.allowedRepos.filter((item, i) => {
      return item.name === this.data.repository.full_name
    })[0];
  }

  deploy() {
    if (!this.checkEvent())
      return

    if (!this.checkRepos())
      return

    let repo = this.getRepoData();

    let tasks = repo.commands.map((value, item) => {
      return (cb) => {
        value = value.replace('[$reposPath]', repo.reposPath).replace('[$deployPath]', repo.deployPath);

        exec(value, {cwd: repo.reposPath}, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);
          cb();
        });
      }
    })
    async.waterfall( tasks );

  }
}

app.use(bodyParser.json())
app.all('/', (req, res) => {
  new WebHookHandler(req.body);
  res.send();
})
app.listen(port, () => console.log(`listening on port ${port}!`))