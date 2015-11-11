exports.getForm = function(req, res) {
  res.json({
    title: 'Feedback!'
  });
};
exports.submit = function(req, res) {
  res.json({
    title: 'Feedback submitted!'
  });
};