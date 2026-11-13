/* global jest */
// Roda antes de cada arquivo de teste (package.json › jest › setupFiles).
// O armazenamento do celular não existe no Node: a própria biblioteca traz um substituto em memória.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
