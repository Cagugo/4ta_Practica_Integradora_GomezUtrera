class CurrentDTO {
  constructor(user) {
    this.email = user.email || '';
    this.role = user.role || 'user';
    this._id = user._id || 'id';
  }
}
module.exports = CurrentDTO;
