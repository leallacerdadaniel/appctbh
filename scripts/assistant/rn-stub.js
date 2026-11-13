// Stand-in for react-native when the assistant knowledge is built in Node.
module.exports = { Platform: { OS: 'ios', select: (o) => o.ios ?? o.default } };
