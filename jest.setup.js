// The animation library needs native code that unit tests do not have. This stand-in keeps the same shapes
// (values, animated props, timing) but applies every change at once.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component) => component },
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedProps: (updater) => updater(),
    useAnimatedStyle: (updater) => updater(),
    withTiming: (value) => value,
    withSpring: (value) => value,
  };
});
