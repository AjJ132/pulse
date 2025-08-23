import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// Test schedule events data
const testScheduleEvents = [
  {
    id: '1',
    title: 'Morning Standup Meeting',
    time: '09:00 AM',
    duration: '30 minutes',
    participants: ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson'],
    location: 'Conference Room A',
    type: 'Team Meeting',
    priority: 'High'
  },
  {
    id: '2',
    title: 'Client Presentation',
    time: '02:00 PM',
    duration: '1 hour',
    participants: ['Alex Chen', 'Emily Davis', 'Client Team'],
    location: 'Virtual Meeting',
    type: 'Client Meeting',
    priority: 'Critical'
  },
  {
    id: '3',
    title: 'Product Planning Session',
    time: '11:00 AM',
    duration: '2 hours',
    participants: ['Product Team', 'Design Team', 'Engineering Lead'],
    location: 'Board Room',
    type: 'Planning',
    priority: 'Medium'
  },
  {
    id: '4',
    title: 'Code Review Session',
    time: '04:00 PM',
    duration: '45 minutes',
    participants: ['Senior Developers', 'Junior Developers'],
    location: 'Development Area',
    type: 'Technical',
    priority: 'Medium'
  },
  {
    id: '5',
    title: 'Weekly Team Retrospective',
    time: '03:30 PM',
    duration: '1 hour',
    participants: ['Entire Team', 'Scrum Master'],
    location: 'Team Space',
    type: 'Retrospective',
    priority: 'Low'
  },
  {
    id: '6',
    title: 'Lunch with Stakeholders',
    time: '12:30 PM',
    duration: '1 hour',
    participants: ['Project Manager', 'Stakeholders'],
    location: 'Restaurant Downtown',
    type: 'Networking',
    priority: 'Medium'
  },
  {
    id: '7',
    title: 'Training Session: New Tools',
    time: '10:00 AM',
    duration: '2 hours',
    participants: ['Development Team', 'QA Team'],
    location: 'Training Room',
    type: 'Training',
    priority: 'High'
  },
  {
    id: '8',
    title: 'End of Sprint Demo',
    time: '01:00 PM',
    duration: '1.5 hours',
    participants: ['Product Owner', 'Stakeholders', 'Development Team'],
    location: 'Main Conference Room',
    type: 'Demo',
    priority: 'High'
  },
  {
    id: '9',
    title: 'One-on-One Meeting',
    time: '05:00 PM',
    duration: '30 minutes',
    participants: ['Manager', 'Team Member'],
    location: 'Private Office',
    type: '1:1',
    priority: 'Medium'
  },
  {
    id: '10',
    title: 'Emergency Bug Fix Meeting',
    time: '08:00 AM',
    duration: '1 hour',
    participants: ['On-Call Engineer', 'Tech Lead', 'Product Manager'],
    location: 'War Room',
    type: 'Emergency',
    priority: 'Critical'
  }
];

export const scheduleHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Randomly select 4-8 events to return
  const numEvents = Math.floor(Math.random() * 5) + 4; // Random number between 4-8
  const shuffledEvents = [...testScheduleEvents].sort(() => Math.random() - 0.5);
  const selectedEvents = shuffledEvents.slice(0, numEvents);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify({
      message: 'Schedule handler response',
      data: {
        schedules: selectedEvents,
        totalCount: testScheduleEvents.length,
        returnedCount: selectedEvents.length
      }
    })
  };
};