import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration } from 'react-native';

const WORK_TIME = 25 * 60; // 25 dakika (saniye cinsinden)
const BREAK_TIME = 5 * 60; // 5 dakika

export default function App() {
  const [secondsLeft, setSecondsLeft] = useState(WORK_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isWorkMode, setIsWorkMode] = useState(true);

  useEffect(() => {
    let interval = null;

    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      // Süre bittiğinde yapılacaklar
      Vibration.vibrate();
      toggleMode();
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const toggleMode = () => {
    setIsActive(false);
    setIsWorkMode(!isWorkMode);
    setSecondsLeft(!isWorkMode ? WORK_TIME : BREAK_TIME);
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(isWorkMode ? WORK_TIME : BREAK_TIME);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: isWorkMode ? '#E74C3C' : '#2ECC71' }]}>
      <Text style={styles.title}>{isWorkMode ? 'Çalışma Zamanı' : 'Mola!'}</Text>
      
      <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => setIsActive(!isActive)}
        >
          <Text style={styles.buttonText}>{isActive ? 'DURDUR' : 'BAŞLAT'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={resetTimer}>
          <Text style={styles.buttonText}>SIFIRLA</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={toggleMode}>
        <Text style={styles.switchText}>
          {isWorkMode ? 'Molaya Geç' : 'Çalışmaya Dön'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  timer: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchText: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
});
