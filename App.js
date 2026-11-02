import React, { useState, useEffect } from 'react';

const getEventReminders = (events) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return events.filter((event) => {
    const eventDate = new Date(event.date + 'T00:00:00');
    const difference = Math.ceil(
      (eventDate - today) / (1000 * 60 * 60 * 24)
    );

    return difference >= 0 && difference <= 1;
  });
};




import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';



import * as SQLite from 'expo-sqlite';

export default function App() {

  const [screen, setScreen] = useState('home');

  const [db, setDb] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [description, setDescription] = useState('');

  const [events, setEvents] = useState([]);
  const [editingEventId, setEditingEventId] = useState(null);

  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState('');

  // INITIALIZE DATABASE
  useEffect(() => {
    initializeDatabase();
  }, []);



  const initializeDatabase = async () => {
    try {
      const database = await SQLite.openDatabaseAsync('eventplanner.db');

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          description TEXT NOT NULL
        );
      `);

      setDb(database);

      await refreshEvents(database);

    } catch (error) {
      console.log('Database Error:', error);
      Alert.alert('Database Error', 'Unable to open database.');
    } finally {
      setDbLoading(false);
    }
  };

  // LOAD EVENTS FROM DATABASE
  const refreshEvents = async (database = db) => {
    if (!database) return;

    try {
      const rows = await database.getAllAsync(
        'SELECT * FROM events ORDER BY date, time'
      );

      setEvents(rows);
    } catch (error) {
      console.log('Load Events Error:', error);
      Alert.alert('Error', 'Unable to load events.');
    }
  };

  // RESET FORM
  const resetForm = () => {
    setEventName('');
    setEventDate('');
    setEventTime('');
    setDescription('');
    setEditingEventId(null);
  };

  // OPEN ADD EVENT SCREEN
  const openAddScreen = () => {
    resetForm();
    setScreen('add');
  };

  // VALIDATE FORM
  const validateForm = () => {

    if (
      !eventName.trim() ||
      !eventDate.trim() ||
      !eventTime.trim() ||
      !description.trim()
    ) {
      Alert.alert('Error', 'Please fill all fields');
      return false;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(eventDate)) {
      Alert.alert('Invalid Date', 'Use YYYY-MM-DD format');
      return false;
    }

    const parsedDate = new Date(eventDate + 'T00:00:00');

    if (
      isNaN(parsedDate.getTime()) ||
      parsedDate.getFullYear() !== Number(eventDate.slice(0, 4)) ||
      parsedDate.getMonth() + 1 !== Number(eventDate.slice(5, 7)) ||
      parsedDate.getDate() !== Number(eventDate.slice(8, 10))
    ) {
      Alert.alert('Invalid Date', 'Enter a valid date');
      return false;
    }

    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timePattern.test(eventTime)) {
      Alert.alert('Invalid Time', 'Use HH:MM format');
      return false;
    }

    return true;
  };

  // SAVE OR UPDATE EVENT
  const saveEvent = async () => {

    if (!validateForm()) return;

    if (!db) {
      Alert.alert('Please Wait', 'Database is not ready.');
      return;
    }

    try {

      if (editingEventId !== null) {

        // UPDATE EVENT IN DATABASE
        await db.runAsync(
          `UPDATE events
           SET name = ?, date = ?, time = ?, description = ?
           WHERE id = ?`,
          eventName.trim(),
          eventDate,
          eventTime,
          description.trim(),
          editingEventId
        );

        Alert.alert('Success', 'Event updated successfully!');

      } else {

        // INSERT NEW EVENT INTO DATABASE
        await db.runAsync(
          `INSERT INTO events (name, date, time, description)
           VALUES (?, ?, ?, ?)`,
          eventName.trim(),
          eventDate,
          eventTime,
          description.trim()
        );

        Alert.alert('Success', 'Event saved successfully!');
      }

      await refreshEvents();

      resetForm();
      setScreen('home');

    } catch (error) {
      console.log('Save Event Error:', error);
      Alert.alert('Error', 'Unable to save event.');
    }
  };

  // EDIT EVENT
  const editEvent = (event) => {

    setEventName(event.name);
    setEventDate(event.date);
    setEventTime(event.time);
    setDescription(event.description);

    setEditingEventId(event.id);

    setScreen('add');
  };

  // DELETE EVENT
  const deleteEvent = (id) => {

    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {

            try {

              await db.runAsync(
                'DELETE FROM events WHERE id = ?',
                id
              );

              await refreshEvents();

              Alert.alert('Deleted', 'Event deleted successfully!');

            } catch (error) {
              console.log('Delete Error:', error);
              Alert.alert('Error', 'Unable to delete event.');
            }
          }
        }
      ]
    );
  };

  // TODAY'S DATE
  const today = new Date();

  const todayString =
    today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');

  // UPCOMING EVENTS
  const upcomingEvents = events
    .filter(event => event.date >= todayString)
    .sort((a, b) =>
      (a.date + ' ' + a.time).localeCompare(
        b.date + ' ' + b.time
      )
    );

  // SEARCH EVENTS
  const filteredEvents = events
    .filter(event => {

      const nameMatches = event.name
        .toLowerCase()
        .includes(searchName.trim().toLowerCase());

      const dateMatches = event.date.includes(searchDate.trim());

      return nameMatches && dateMatches;
    })
    .sort((a, b) =>
      (a.date + ' ' + a.time).localeCompare(
        b.date + ' ' + b.time
      )
    );

  const hasSearch =
    searchName.trim() !== '' ||
    searchDate.trim() !== '';

    // EVENT REMINDERS
const reminderEvents = getEventReminders(events);

  // EVENT CARD
  const renderEventCard = (event) => (

    <View key={event.id} style={styles.eventCard}>

      <Text style={styles.eventName}>
        {event.name}
      </Text>

      <Text style={styles.eventDetail}>
        Date: {event.date}
      </Text>

      <Text style={styles.eventDetail}>
        Time: {event.time}
      </Text>

      <Text style={styles.eventDetail}>
        Description: {event.description}
      </Text>

      <View style={styles.actionRow}>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => editEvent(event)}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteEvent(event.id)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>

      </View>

    </View>
  );

  // DATABASE LOADING SCREEN
  if (dbLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>Event Planner</Text>
        <Text style={styles.cardText}>Loading Database...</Text>
      </View>
    );
  }

  return (

    <ScrollView style={styles.container}>

      {/* HOME SCREEN */}

      {screen === 'home' && (

        <View>

          <View style={styles.header}>

            <Text style={styles.greeting}>Hello!</Text>

            <Text style={styles.title}>Event Planner</Text>

            <Text style={styles.subtitle}>
              Plan your special moments
            </Text>

          </View>

          <View style={styles.card}>

            <Text style={styles.cardTitle}>
              Welcome to Event Planner
            </Text>

            <Text style={styles.cardText}>
              Organize your events easily and
              never miss an important moment.
            </Text>

          </View>
         {/* EVENT REMINDERS */}

<View style={styles.reminderCard}>

  <Text style={styles.reminderTitle}>
    🔔 Event Reminders
  </Text>

  {reminderEvents.length === 0 ? (

    <Text style={styles.reminderText}>
      No events today or tomorrow.
    </Text>

  ) : (

    reminderEvents.map(event => (

      <View key={event.id} style={styles.reminderItem}>

        <Text style={styles.reminderEventName}>
          {event.name}
        </Text>

        <Text style={styles.reminderText}>
          Date: {event.date}
        </Text>

        <Text style={styles.reminderText}>
          Time: {event.time}
        </Text>

        <Text style={styles.reminderMessage}>
          {event.date === todayString
            ? 'Your event is today!'
            : 'Your event is tomorrow!'}
        </Text>

      </View>

    ))

  )}

</View>

















          <Text style={styles.sectionTitle}>
            Quick Actions
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={openAddScreen}
          >
            <Text style={styles.buttonText}>
              + Add New Event
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setScreen('events')}
          >
            <Text style={styles.buttonText}>
              View Upcoming Events ({upcomingEvents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setScreen('search')}
          >
            <Text style={styles.buttonText}>
              Search Events
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>

            <Text style={styles.footerText}>
              Make every moment special!
            </Text>

          </View>

        </View>
      )}

      {/* ADD / EDIT EVENT SCREEN */}

      {screen === 'add' && (

        <View>

          <TouchableOpacity
            onPress={() => {
              resetForm();
              setScreen('home');
            }}
          >
            <Text style={styles.backButton}>
              ← Back to Home
            </Text>
          </TouchableOpacity>

          <Text style={styles.formTitle}>
            {editingEventId !== null ? 'Edit Event' : 'Add New Event'}
          </Text>

          <Text style={styles.formSubtitle}>
            Enter your event details below
          </Text>

          <Text style={styles.label}>Event Name</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter event name"
            value={eventName}
            onChangeText={setEventName}
          />

          <Text style={styles.label}>Event Date</Text>

          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={eventDate}
            onChangeText={setEventDate}
          />

          <Text style={styles.label}>Event Time</Text>

          <TextInput
            style={styles.input}
            placeholder="HH:MM"
            value={eventTime}
            onChangeText={setEventTime}
          />

          <Text style={styles.label}>Description</Text>

          <TextInput
            style={[styles.input, styles.description]}
            placeholder="Enter event description"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={saveEvent}
          >
            <Text style={styles.buttonText}>
              {editingEventId !== null ? 'Update Event' : 'Save Event'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              resetForm();
              setScreen('home');
            }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

        </View>
      )}

      {/* UPCOMING EVENTS SCREEN */}

      {screen === 'events' && (

        <View>

          <TouchableOpacity
            onPress={() => setScreen('home')}
          >
            <Text style={styles.backButton}>
              ← Back to Home
            </Text>
          </TouchableOpacity>

          <Text style={styles.formTitle}>
            Upcoming Events
          </Text>

          <Text style={styles.formSubtitle}>
            Your scheduled events
          </Text>

          {upcomingEvents.length === 0 ? (

            <View style={styles.emptyCard}>

              <Text style={styles.emptyTitle}>
                No Upcoming Events
              </Text>

              <Text style={styles.cardText}>
                You have not added any upcoming events yet.
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={openAddScreen}
              >
                <Text style={styles.buttonText}>
                  + Add Your First Event
                </Text>
              </TouchableOpacity>

            </View>

          ) : (

            upcomingEvents.map(event => renderEventCard(event))

          )}

        </View>
      )}

      {/* SEARCH EVENTS SCREEN */}

      {screen === 'search' && (

        <View>

          <TouchableOpacity
            onPress={() => {
              setSearchName('');
              setSearchDate('');
              setScreen('home');
            }}
          >
            <Text style={styles.backButton}>
              ← Back to Home
            </Text>
          </TouchableOpacity>

          <Text style={styles.formTitle}>
            Search Events
          </Text>

          <Text style={styles.formSubtitle}>
            Find events by name or date
          </Text>

          <Text style={styles.label}>
            Search by Event Name
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter event name"
            value={searchName}
            onChangeText={setSearchName}
          />

          <Text style={styles.label}>
            Search by Event Date
          </Text>

          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={searchDate}
            onChangeText={setSearchDate}
          />

          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchName('');
              setSearchDate('');
            }}
          >
            <Text style={styles.clearText}>
              Clear Search
            </Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>
            Search Results ({hasSearch ? filteredEvents.length : 0})
          </Text>

          {!hasSearch ? (

            <View style={styles.emptyCard}>

              <Text style={styles.emptyTitle}>
                Search for an Event
              </Text>

              <Text style={styles.cardText}>
                Enter an event name or date to find your events.
              </Text>

            </View>

          ) : filteredEvents.length === 0 ? (

            <View style={styles.emptyCard}>

              <Text style={styles.emptyTitle}>
                No Events Found
              </Text>

              <Text style={styles.cardText}>
                Try another event name or date.
              </Text>

            </View>

          ) : (

            filteredEvents.map(event => renderEventCard(event))

          )}

        </View>
      )}

    </ScrollView>
  );
}

// STYLES

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F2F6FC',
    padding: 20
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F2F6FC',
    justifyContent: 'center',
    alignItems: 'center'
  },

  header: {
    marginTop: 45,
    marginBottom: 25
  },

  greeting: {
    fontSize: 18,
    color: '#64748B'
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#173B70'
  },

  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 5
  },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 18,
    marginBottom: 25
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#173B70'
  },

  cardText: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 10,
    lineHeight: 23
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#173B70',
    marginBottom: 15,
    marginTop: 15
  },

  button: {
    backgroundColor: '#2456A6',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center'
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },

  footer: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 30
  },

  footerText: {
    color: '#64748B',
    fontSize: 14
  },

  backButton: {
    fontSize: 16,
    color: '#2456A6',
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 25
  },

  formTitle: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#173B70'
  },

  formSubtitle: {
    color: '#64748B',
    marginTop: 8,
    marginBottom: 25
  },

  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#173B70',
    marginBottom: 8,
    marginTop: 12
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DFEF',
    borderRadius: 10,
    padding: 15,
    fontSize: 15,
    color: '#173B70'
  },

  description: {
    height: 110,
    textAlignVertical: 'top'
  },

  cancelButton: {
    padding: 15,
    alignItems: 'center'
  },

  cancelText: {
    color: '#2456A6',
    fontSize: 16,
    fontWeight: 'bold'
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 15
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#173B70'
  },

  eventCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#2456A6'
  },

  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#173B70',
    marginBottom: 12
  },

  eventDetail: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 8
  },

  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10
  },

  editButton: {
    flex: 1,
    backgroundColor: '#2456A6',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center'
  },

  deleteButton: {
    flex: 1,
    backgroundColor: '#D93636',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center'
  },

  clearButton: {
    backgroundColor: '#E1EAF8',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15
  },

  clearText: {
    color: '#2456A6',
    fontSize: 15,
    fontWeight: 'bold'
  },

reminderCard: {
  backgroundColor: '#E1EAF8',
  padding: 20,
  borderRadius: 15,
  marginBottom: 25,
  borderLeftWidth: 5,
  borderLeftColor: '#2456A6'
},

reminderTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#173B70',
  marginBottom: 12
},

reminderItem: {
  backgroundColor: '#FFFFFF',
  padding: 12,
  borderRadius: 10,
  marginTop: 10
},

reminderEventName: {
  fontSize: 17,
  fontWeight: 'bold',
  color: '#173B70',
  marginBottom: 5
},

reminderText: {
  fontSize: 14,
  color: '#475569',
  marginTop: 4
},

reminderMessage: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#2456A6',
  marginTop: 8
},





























});