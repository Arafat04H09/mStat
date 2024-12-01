import { Container, Typography, Button, Box } from '@mui/material';

const HomePage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 5, textAlign: 'center', backgroundColor: '#f0f4f8', mb: 4 }}>
        <Typography variant="h2" gutterBottom>
          Welcome to Your Music Journey
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Discover insights and stories about your listening habits.
        </Typography>
        <Button variant="contained" color="primary" size="large" href = "/dashboard">
          Get Started
        </Button>
      </Box>

      <Box sx={{ py: 5, textAlign: 'center', mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          About Us
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Confused about how to start?
        </Typography>
        <Button variant="outlined" color="primary">
          Learn More
        </Button>
      </Box>
    </Container>
  );
};

export default HomePage;