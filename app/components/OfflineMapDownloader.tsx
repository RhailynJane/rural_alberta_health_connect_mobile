import Mapbox from '@rnmapbox/maps';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  ALBERTA_REGIONS,
  DEFAULT_MAP_CONFIG,
  OFFLINE_PACK_CONFIG,
} from '../_config/mapbox.config';
import { COLORS, FONTS } from '../constants/constants';
import StatusModal from './StatusModal';

interface OfflineRegion {
  id: string;
  name: string;
  downloaded: boolean;
  progress: number;
  size?: string;
  description?: string;
}

interface OfflineMapDownloaderProps {
  visible: boolean;
  onClose: () => void;
  onRegionDownloaded?: (center: { latitude: number; longitude: number; zoom?: number }) => void;
}

export default function OfflineMapDownloader({
  visible,
  onClose,
  onRegionDownloaded,
}: OfflineMapDownloaderProps) {
  const [regions, setRegions] = useState<OfflineRegion[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalButtons, setModalButtons] = useState<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'destructive' }[]>([]);

  useEffect(() => {
    if (visible) {
      loadOfflineRegions();
    }
  }, [visible]);

  const loadOfflineRegions = async () => {
    try {
      const offlinePacks = await Mapbox.offlineManager.getPacks();
      const downloadedIds = offlinePacks.map((pack) => pack.name);

      const regionStatus = ALBERTA_REGIONS.map((region) => ({
        id: region.id,
        name: region.name,
        downloaded: downloadedIds.includes(region.id),
        progress: downloadedIds.includes(region.id) ? 100 : 0,
        size: region.estimatedSize || '10-50MB',
        description: region.description || '',
      }));

      setRegions(regionStatus);
    } catch (error) {
      console.error('Error loading offline regions:', error);
      setModalTitle('Error');
      setModalMessage('Failed to load offline regions');
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    }
  };

  const downloadRegion = async (regionId: string) => {
    const region = ALBERTA_REGIONS.find((r) => r.id === regionId);
    if (!region) return;

    // Prevent multiple simultaneous downloads
    if (downloading) {
      console.log('Download already in progress, skipping...');
      return;
    }

    try {
      setDownloading(regionId);
      setDownloadProgress(0);

      const bounds = region.bounds;
      const packOptions = {
        name: regionId,
        styleURL: DEFAULT_MAP_CONFIG.style,
        bounds: [
          [bounds[0][0], bounds[0][1]], // Southwest
          [bounds[1][0], bounds[1][1]], // Northeast
        ],
        minZoom: OFFLINE_PACK_CONFIG.minZoom,
        maxZoom: OFFLINE_PACK_CONFIG.maxZoom,
      };

      await Mapbox.offlineManager.createPack(
        packOptions as any,
        (progressUpdate: any) => {
          const progress =
            (progressUpdate.completedResourceCount /
              progressUpdate.requiredResourceCount) *
            100;
          setDownloadProgress(progress);
          
          // Update region status
          setRegions((prev) =>
            prev.map((r) =>
              r.id === regionId ? { ...r, progress: Math.round(progress) } : r
            )
          );
        }
      );

      // Mark as downloaded
      setRegions((prev) =>
        prev.map((r) =>
          r.id === regionId ? { ...r, downloaded: true, progress: 100 } : r
        )
      );

      setModalTitle('Success');
      setModalMessage(`${region.name} has been downloaded for offline use!`);
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);

      // Notify parent to focus the map on this region
      if (onRegionDownloaded && Array.isArray(region.center) && region.center.length === 2) {
        const [lon, lat] = region.center as [number, number];
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          onRegionDownloaded({ latitude: lat, longitude: lon, zoom: region.zoom ?? 10 });
        }
      }
    } catch (error) {
      console.error('Error downloading region:', error);
      
      // Reset region progress on error
      setRegions((prev) =>
        prev.map((r) =>
          r.id === regionId ? { ...r, progress: 0 } : r
        )
      );
      
      setModalTitle('Error');
      setModalMessage('Failed to download map region. Please try again.');
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    } finally {
      setDownloading(null);
      setDownloadProgress(0);
    }
  };

  const deleteRegion = async (regionId: string) => {
    const region = ALBERTA_REGIONS.find((r) => r.id === regionId);
    if (!region) return;

    setModalTitle('Delete Offline Map');
    setModalMessage(`Are you sure you want to delete the offline map for ${region.name}?`);
    setModalButtons([
      { label: 'Cancel', onPress: () => setModalVisible(false), variant: 'secondary' },
      {
        label: 'Delete',
        onPress: async () => {
          setModalVisible(false);
          try {
            await Mapbox.offlineManager.deletePack(regionId);
            setRegions((prev) =>
              prev.map((r) =>
                r.id === regionId
                  ? { ...r, downloaded: false, progress: 0 }
                  : r
              )
            );
            setModalTitle('Success');
            setModalMessage('Offline map deleted');
            setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
            setModalVisible(true);
          } catch (error) {
            console.error('Error deleting region:', error);
            setModalTitle('Error');
            setModalMessage('Failed to delete offline map');
            setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
            setModalVisible(true);
          }
        },
        variant: 'destructive',
      },
    ]);
    setModalVisible(true);
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Offline Maps</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={COLORS.darkGray} />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              Download maps for offline use in areas with poor connectivity
            </Text>

            {/* Regions List */}
            <ScrollView style={styles.regionsList}>
              {regions.map((region) => (
                <View key={region.id} style={styles.regionCard}>
                  <View style={styles.regionInfo}>
                    <Text style={styles.regionName}>{region.name}</Text>
                    {region.description && (
                      <Text style={styles.regionDescription}>{region.description}</Text>
                    )}
                    <Text style={styles.regionSize}>Size: {region.size}</Text>
                    {region.downloaded && (
                      <View style={styles.downloadedBadge}>
                        <Icon name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.downloadedText}>Downloaded</Text>
                      </View>
                    )}
                    {downloading === region.id && (
                      <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>
                          {Math.round(downloadProgress)}%
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.regionActions}>
                    {!region.downloaded && !downloading && (
                      <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={() => downloadRegion(region.id)}
                        disabled={downloading !== null}
                      >
                        <Icon name="download-outline" size={20} color="white" />
                        <Text style={styles.downloadButtonText}>Download</Text>
                      </TouchableOpacity>
                    )}

                    {downloading === region.id && (
                      <View style={styles.downloadingContainer}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={styles.downloadingText}>Downloading...</Text>
                      </View>
                    )}

                    {region.downloaded && downloading !== region.id && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteRegion(region.id)}
                      >
                        <Icon name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Info Footer */}
            <View style={styles.footer}>
              <Icon name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.footerText}>
                Each region is approximately 10-50 MB. Download on WiFi recommended.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* StatusModal for alerts */}
      <StatusModal
        visible={modalVisible}
        type={modalTitle === 'Success' ? 'success' : modalTitle === 'Error' ? 'error' : 'confirm'}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        buttons={modalButtons.length > 0 ? modalButtons : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 24,
    color: COLORS.darkText,
  },
  closeButton: {
    padding: 8,
  },
  subtitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  regionsList: {
    paddingHorizontal: 20,
  },
  regionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regionInfo: {
    flex: 1,
  },
  regionName: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkText,
    marginBottom: 4,
  },
  regionDescription: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginBottom: 4,
    lineHeight: 16,
  },
  regionSize: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 6,
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  downloadedText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 12,
    color: COLORS.primary,
  },
  regionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: 'white',
    marginLeft: 6,
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadingText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginLeft: 8,
    flex: 1,
  },
});
