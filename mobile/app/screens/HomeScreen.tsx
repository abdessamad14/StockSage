import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Appbar, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { config } from '../config/config';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content 
          title={`Welcome, ${user?.username || 'Merchant'}`} 
          subtitle={user?.businessName || 'iGoodar Merchant App'}
        />
        <Appbar.Action icon="cog" onPress={() => navigation.navigate('Settings' as never)} />
        <Appbar.Action icon="logout" onPress={handleLogout} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <View style={styles.welcomeContainer}>
          <Card style={styles.welcomeCard}>
            <Card.Content>
              <Title style={styles.welcomeTitle}>Merchant Dashboard</Title>
              <Paragraph style={styles.welcomeText}>
                Manage your orders, view products, and stay connected with your suppliers.
              </Paragraph>
            </Card.Content>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => navigation.navigate('CreateOrder' as never)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#3366FF' }]}>
              <Avatar.Icon size={40} icon="cart-plus" color="#FFF" style={{ backgroundColor: 'transparent' }} />
            </View>
            <Text style={styles.actionText}>New Order</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => navigation.navigate('Orders' as never)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FF6633' }]}>
              <Avatar.Icon size={40} icon="clipboard-list" color="#FFF" style={{ backgroundColor: 'transparent' }} />
            </View>
            <Text style={styles.actionText}>My Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => navigation.navigate('Products' as never)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#28A745' }]}>
              <Avatar.Icon size={40} icon="package-variant-closed" color="#FFF" style={{ backgroundColor: 'transparent' }} />
            </View>
            <Text style={styles.actionText}>Products</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => navigation.navigate('Suppliers' as never)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#17A2B8' }]}>
              <Avatar.Icon size={40} icon="truck-delivery" color="#FFF" style={{ backgroundColor: 'transparent' }} />
            </View>
            <Text style={styles.actionText}>Suppliers</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.recentOrdersCard}>
          <Card.Title title="Recent Orders" />
          <Card.Content>
            <Paragraph>View and manage your recent orders.</Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('Orders' as never)}
            >
              View All Orders
            </Button>
          </Card.Actions>
        </Card>
        
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionText}>
            Server: {config.API_URL}
          </Text>
          <Text style={styles.connectionHint}>
            Tap the settings icon to change the server address
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  appbar: {
    backgroundColor: '#3366FF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  welcomeContainer: {
    marginBottom: 24,
  },
  welcomeCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  welcomeText: {
    color: '#6C757D',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212529',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionItem: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 8,
  },
  recentOrdersCard: {
    marginBottom: 24,
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 2,
  },
  connectionInfo: {
    marginBottom: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
  connectionText: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
  connectionHint: {
    fontSize: 10,
    color: '#ADB5BD',
    fontStyle: 'italic',
  },
});

export default HomeScreen;