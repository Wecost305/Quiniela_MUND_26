const { json } = require("./_common");

exports.handler = async () => {
  const v = (process.env.ADMIN_KEY || "");
  return json(200, {
    envSet: !!v,
    envLen: v.length
  });
};
