import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, Divider, Switch, List, Appbar } from 'react-native-paper';
import { config, setServerIP } from '../config/config';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen = () => {
  const [serverIP, setServerIPState] = useState('');
  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);
  const navigation = useNavigation();

  // Get current IP from config on mount
  useEffect(() => {
    const currentURL = config.API_URL;
    const ipMatch = currentURL.match(/http:\/\/([^:]+):/);
    if (ipMatch && ipMatch[1]) {
      setServerIPState(ipMatch[1]);
    }
  }, []);

  const handleSaveServerIP = () => {
    if (!serverIP.trim()) {
      Alert.alert("Error", "Please enter a valid IP address");
      return;
    }

    try {
      // Validate IP format (simple validation)
      const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = serverIP.match(ipRegex);
      
      if (!match) {
        Alert.alert("Error", "Please enter a valid IP address format (e.g. 192.168.1.100)");
        return;
      }
      
      // Check each octet is in valid range
      for (let i = 1; i <= 4; i++) {
        const octet = parseInt(match[i]);
        if (octet < 0 || octet > 255) {
          Alert.alert("Error", `IP address octet ${i} is out of range (must be 0-255)`);
          return;
        }
      }
      
      // Save the server IP
      setServerIP(serverIP);
      
      Alert.alert(
        "Success", 
        `Server IP updated to ${serverIP}. The API will now connect to ${config.API_URL}`,
        [
          { text: "OK" }
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save server IP: " + (error as Error).message);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <Card style={styles.card}>
            <Card.Title title="Server Connection" />
            <Card.Content>
              <Text style={styles.helpText}>
                Configure the server IP address to connect to the iGoodar Stock backend.
                Make sure your device and the server are on the same network.
              </Text>
              
              <TextInput
                label="Server IP Address"
                value={serverIP}
                onChangeText={setServerIPState}
                mode="outlined"
                style={styles.input}
                placeholder="e.g. 192.168.1.100"
                keyboardType="numbers-and-punctuation"
              />
              
              <Text style={styles.currentUrl}>
                Current API URL: {config.API_URL}
              </Text>
              
              <Button 
                mode="contained" 
                onPress={handleSaveServerIP}
                style={styles.button}
              >
                Save Connection Settings
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Title title="Environment" />
            <Card.Content>
              <List.Item 
                title="Environment" 
                description={`Current app environment: ${config.ENV}`}
                left={props => <List.Icon {...props} icon="information-outline" />}
              />
            </Card.Content>
          </Card>

          <List.Accordion
            title="Advanced Settings"
            expanded={advancedSettingsVisible}
            onPress={() => setAdvancedSettingsVisible(!advancedSettingsVisible)}
            left={props => <List.Icon {...props} icon="tools" />}
            style={styles.advancedSettings}
          >
            <List.Item 
              title="Clear Cache"
              description="Clear the local data cache"
              left={props => <List.Icon {...props} icon="cached" />}
              onPress={() => Alert.alert("Not Implemented", "This feature is not yet implemented.")}
            />
            <List.Item 
              title="Debug Mode"
              description="Enable detailed logging"
              left={props => <List.Icon {...props} icon="bug" />}
              right={() => (
                <Switch
                  value={config.ENV === 'development'}
                  disabled={true}
                />
              )}
            />
          </List.Accordion>
          
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>iGoodar Merchant v1.0.0</Text>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  keyboardAvoidingView: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 1,
  },
  input: {
    marginVertical: 8,
  },
  button: {
    marginTop: 16,
  },
  helpText: {
    marginBottom: 12,
    color: '#666',
  },
  currentUrl: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  advancedSettings: {
    backgroundColor: 'white',
    elevation: 1,
    marginBottom: 16,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  versionText: {
    color: '#888',
    fontSize: 12,
  },
});

export default SettingsScreen;