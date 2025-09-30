// components/HealthStatusTag.tsx
import { StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../constants/constants';

interface HealthStatusTagProps {
  status: string;
}

const HealthStatusTag: React.FC<HealthStatusTagProps> = ({ status }) => {
  // Determine background color based on status
  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case 'good':
        return '#28A745'; // Green
      case 'fair':
        return '#FFC107'; // Yellow/Amber
      case 'poor':
        return '#DC3545'; // Red
      case 'excellent':
        return '#17A2B8'; // Teal
      default:
        return '#6C757D'; // Gray for unknown status
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
      <Text style={[styles.statusText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default HealthStatusTag;