import React, { useState } from 'react';
import { parseISO, eachDayOfInterval, format } from 'date-fns';
import { saveAs } from 'file-saver';
import ical from 'ical-generator';
import { 
  Button, 
  Typography, 
  Container, 
  Box,
  TextField,
  Snackbar,
  Alert
} from '@mui/material';

const ScheduleProcessor = () => {
  const [file, setFile] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.cccsched')) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedData = JSON.parse(e.target.result);
          if (!parsedData.schedule) {
            throw new Error('Invalid file format: missing schedule data');
          }
          setScheduleData(parsedData);
          setError('');
        } catch (error) {
          console.error('Error parsing JSON:', error);
          setError('Error parsing the file. Please make sure it\'s a valid .cccsched file.');
          setScheduleData(null);
        }
      };
      reader.readAsText(selectedFile);
    } else {
      setError('Please select a valid .cccsched file.');
      setFile(null);
      setScheduleData(null);
    }
  };

  const generateICalFile = () => {
    if (!scheduleData || !startDate || !endDate) {
      setError('Please upload a file and set start and end dates.');
      return;
    }

    try {
      const cal = ical({ name: 'Faculty Schedule' });
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      eachDayOfInterval({ start, end }).forEach((day) => {
        const dayOfWeek = format(day, 'EEEE').toLowerCase();
        const daySchedule = scheduleData.schedule[dayOfWeek];

        if (Array.isArray(daySchedule)) {
          daySchedule.forEach((item) => {
            if (item && item.type && item.startTime && item.endTime) {
              const eventStart = new Date(day);
              eventStart.setHours(parseInt(item.startTime.split(':')[0], 10), parseInt(item.startTime.split(':')[1], 10));

              const eventEnd = new Date(day);
              eventEnd.setHours(parseInt(item.endTime.split(':')[0], 10), parseInt(item.endTime.split(':')[1], 10));

              if (item.type === 'teaching' || item.type === 'student') {
                cal.createEvent({
                  start: eventStart,
                  end: eventEnd,
                  summary: item.className || `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Hours`,
                  description: item.description || '',
                  location: item.classLocation || '',
                  busyStatus: 'BUSY'
                });
              } else if (item.type === 'campus') {
                cal.createEvent({
                  start: eventStart,
                  end: eventEnd,
                  summary: 'On Campus (Available for Meetings)',
                  description: 'Instructor is on campus and available for meetings during this time.',
                  busyStatus: 'FREE',
                  status: 'CONFIRMED',
                  transparency: 'TRANSPARENT'
                });
              }
            }
          });
        }
      });

      const iCalString = cal.toString();
      const blob = new Blob([iCalString], { type: 'text/calendar;charset=utf-8' });
      saveAs(blob, 'faculty_schedule.ics');
      setError('');
    } catch (error) {
      console.error('Error generating iCal file:', error);
      setError('Error generating iCal file. Please check your schedule data and try again.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Faculty Schedule Processor
        </Typography>
        <p>This site is designed to take a cccsched file generated from the <a href="https://faculty-schedule-builder.vercel.app">Faculty Schedule Builder</a> and turn it into a file that can be imported in your Outlook calendar.</p>
        <p>To create your ical/ics file:
          <ol>
            <li>Upload your cccsched file</li>
            <li>Enter the start and end dates for the semester</li>
            <li>Click "Generate ICAL File"</li>
          </ol>
        </p>
        <p>Double click the downloaded file to open it in Outlook and add it to your calendar.</p>
        <Box sx={{ my: 2 }}>
          <Button
            variant="contained"
            component="label"
          >
            Upload File
            <input
              type="file"
              hidden
              onChange={handleFileChange}
              accept=".cccsched"
            />
          </Button>
          {file && <Typography variant="body2">{file.name}</Typography>}
        </Box>
        <Box sx={{ my: 2 }}>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Box sx={{ my: 2 }}>
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Button
          variant="contained"
          onClick={generateICalFile}
          disabled={!file || !startDate || !endDate}
        >
          Generate iCal File
        </Button>
      </Box>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ScheduleProcessor;