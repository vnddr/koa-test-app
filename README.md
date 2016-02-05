
# koa-test-app
This is an amazingly useless web application based on node.js Koa framework with Handlebars templates.


### Installation

Clone the repository, then download the dependencies using nvm
```sh
$ nvm install
```

If you don't have node.js installed, you can install it with nvm too:
```sh
$ nvm ls-remote
$ nvm install 4.2.6
$ nvm ls
$ nvm use 4.2.6

$ node app.js
```

### Usage

Open your browser and head to localhost:3000.

You can sign in with pre-registrated test user with login/password: test/test.

Password must be replaced with password hash =( outoftime / forgot.

Comments on russian included.

### Exceptions

Since it's backend-focused application, many events like already-in-use login during the registration are throwing 500. It's not a bug but the feature. Maybe very doubtable feature, I know.
