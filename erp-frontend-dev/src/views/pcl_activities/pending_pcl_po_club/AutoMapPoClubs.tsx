import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Alert, Box, Button, Grid, Typography, useTheme } from '@mui/material';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { pclPOClubAutoMappingSaveURL, pclPOClubAutoMappingURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { getDefaultError } from '@/helpers/Utilities';
import SaveSpinner from '@/components/SaveSpinner';

const AutoMapPoClubs = ({ selectedPoClubIds, refreshData }: any) => {
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [autoMappingClubs, setAutoMappingClubs] = useState<any>([]);

    const fetchData = () => {
        api.post(pclPOClubAutoMappingURL(), { po_club_ids: selectedPoClubIds })
            .then((response) => {
                setAutoMappingClubs(response?.data || []);
                toast.success(DEFAULT_SUCCESS);
            })
            .catch((error) => {
                toast.error('Failed to load data');
            })
            .finally(() => setIsLoading(false));
    };

    const handleDragEnd = (result: any) => {
        const { source, destination } = result;
        if (!destination) return;

        const sourceGroupIndex = autoMappingClubs.findIndex(
            (group: any) => group.display_order === source.droppableId
        );
        const destinationGroupIndex = autoMappingClubs.findIndex(
            (group: any) => group.display_order === destination.droppableId
        );

        if (sourceGroupIndex === -1 || destinationGroupIndex === -1) return;
        const updatedClubs = autoMappingClubs.map((group: { automap_clubs: any; }) => ({
            ...group,
            automap_clubs: [...group.automap_clubs],
        }));
        const sourceClubs = updatedClubs[sourceGroupIndex].automap_clubs;
        const destinationClubs = updatedClubs[destinationGroupIndex].automap_clubs;
        const [movedItem] = sourceClubs.splice(source.index, 1);
        const isDuplicate = destinationClubs.some((club: { id: any; }) => club.id === movedItem.id);

        if (!isDuplicate) {
            destinationClubs.splice(destination.index, 0, movedItem);
        }
        setAutoMappingClubs(updatedClubs);
    };

    const handleAddNewPCLGroup = () => {
        setAutoMappingClubs((prevGroups: any) => {
            const newGroup = {
                id: null as any,
                display_order: `PCL Group - ${prevGroups.length + 1}`,
                automap_clubs: [] as any,
            };
            return [...prevGroups, newGroup];
        });
    };

    const handleSaveAutoMappingClubs = () => {
        setIsSaving(true)
        const saveData = {
            type: 'automap',
            automap_data: autoMappingClubs?.map((pcl: any) => ({
                display_order: pcl?.display_order,
                automap_clubs: pcl?.automap_clubs?.map((club: any) => club?.id)
            }))
        };
        api.post(pclPOClubAutoMappingSaveURL(), saveData).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            refreshData()
            fetchData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => { setIsSaving(false) });
    }

    useEffect(() => {
        fetchData();
    }, []);

    return isLoading ? (
        <DefaultLoader />
    ) : (
        <>
            {autoMappingClubs?.length === 0 ? (
                <Alert severity="info">
                    All selected PO Clubs have already been auto-mapped. No further clubs are available for mapping.
                </Alert>
            ) : (
                <Box sx={{ p: 2 }}>
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Grid container spacing={2}>
                            {autoMappingClubs?.map((group: any) => (
                                <Grid item xs={12} md={4} key={group?.display_order}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            backgroundColor: theme.palette.background.paper,
                                            boxShadow: 1,
                                        }}
                                    >
                                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                                            {group?.display_order}
                                        </Typography>

                                        <Droppable droppableId={group.display_order}>
                                            {(provided) => (
                                                <Box
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                                                >
                                                    {group?.automap_clubs?.length === 0 ? (
                                                        <Box sx={{ p: 1, borderRadius: 1 }}>
                                                            <Typography variant="body1" sx={{ textAlign: 'center' }}>No available clubs</Typography>
                                                        </Box>
                                                    ) : (
                                                        group?.automap_clubs?.map((club: any, index: number) => (
                                                            <Draggable key={club.id} draggableId={club.id.toString()} index={index}>
                                                                {(provided) => (
                                                                    <Box
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        sx={{
                                                                            p: 2,
                                                                            borderRadius: 1,
                                                                            backgroundColor: theme.palette.grey[200],
                                                                            cursor: 'grab',
                                                                        }}
                                                                    >
                                                                        <Typography variant="body1">{club.display_number}</Typography>
                                                                    </Box>
                                                                )}
                                                            </Draggable>
                                                        ))
                                                    )}
                                                    {provided.placeholder}
                                                </Box>
                                            )}
                                        </Droppable>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </DragDropContext>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button variant="contained" onClick={handleAddNewPCLGroup}>Add New Group</Button>
                        <Button variant="contained" sx={{ ml: 1 }} onClick={handleSaveAutoMappingClubs} disabled={isSaving} >{isSaving && <SaveSpinner />}Save</Button>
                    </Box>
                </Box>
            )}

        </>
    );
};

export default AutoMapPoClubs;