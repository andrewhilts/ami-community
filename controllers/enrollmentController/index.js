exports.getForm = function(req, res) {
  res.json({
    title: 'Enrollment!'
  });
};
exports.submit = function(req, res) {
  res.json({
    title: 'Enrolled!'
  });
};