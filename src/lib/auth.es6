module.exports = {
  login: function(email, password) {
    console.log(`Login with ${email}`);
    return true;
  },
  logout: function() {
    console.log('Logout successful');
  }
};
