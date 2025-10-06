import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { SFSymbol } from 'react-native-sfsymbols';

const AnimatedSFSymbol = Animated.createAnimatedComponent(SFSymbol);

const LoadingMessage = () => {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const startOpacityAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startOpacityAnimation();
  }, [opacityAnim]);

  return (
    <View style={{
      alignSelf: "flex-start",
    }}>
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: 22, 
      paddingVertical: 20 
    }}>
      <AnimatedSFSymbol
        name="ellipsis"
        weight="regular"
        size={24} 
        color="darkgray"
        style={{
          opacity: opacityAnim
        }}
      />
    </View>
    </View>
  );
};

export default LoadingMessage;
