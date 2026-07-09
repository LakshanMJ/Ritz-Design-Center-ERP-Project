import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import * as TransportUrls from '@/helpers/constants/rest_urls/TransportUrls';
import toast from 'react-hot-toast';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { getDefaultError } from '@/helpers/Utilities';
import Calendar from '@/components/Ritz/RitzCalendar';
import { Box, Modal, Button, Typography, Tooltip, Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import RitzModal from '@/components/Ritz/RitzModal';
import DefaultLoader from '@/components/DefaultLoader'; 
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import RitzSearchableSelection from '@/components/Ritz/RitzSearchableSelection';

const FreightForwarderCutofDates = ({ freightForwarderId }: any) => {
  const [ports, setPorts] = useState<any[]>([]);
  const [AllPortsId, setAllPortsId] = useState<any[]>([]);
  const [selectedPortId, setSelectedPortId] = useState<number | null>(null);
  const [calendarData, setCalendarData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true); 
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Dayjs | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [timesForSelectedDate, setTimesForSelectedDate] = useState<any[]>([]);

  const handlePortChange = (value: any) => {
    setSelectedPortId(value);
    setIsLoading(true); 
    fetchCalendarData(freightForwarderId, value);
  };

  const fetchCalendarData = (freightForwarderId: number, portId: number) => {
    setIsLoading(true);
    api.get(TransportUrls.freightForwardePortCalanderUrl(freightForwarderId, portId))
      .then(resp => {
        const data = resp.data.reduce((acc: any, item: any) => {
          const dateKey = item.cut_off_date.split('T')[0]; 
          const time = item.cut_off_date.split('T')[1]; 
          const formattedItem = { ...item, date: dateKey, time };
          
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(formattedItem); 
          return acc;
        }, {});
        setCalendarData(data);
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false); 
      });
  };

  const getPortList = () => {
    api.get(TransportUrls.countryPortListUrl()).then(resp => {
      const respData = resp?.data || [];
      const portList = respData.flatMap((country: { ports: any; }) => country.ports);
      setPorts(portList);
      setAllPortsId(portList.map((port: any) => port.id));
      
      if (portList.length > 0) {
        const defaultPortId = portList[0].id;
        setSelectedPortId(defaultPortId);
        fetchCalendarData(freightForwarderId, defaultPortId);
      }

      setIsLoading(false); 
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      setIsLoading(false); 
    });
  };

  useEffect(() => {
    getPortList();
  }, []);

  const handleAddIconClick = (date: Date) => {
    setSelectedDate(date);
    setOpenAddModal(true);
  };

  const handleDeleteIconClick = (date: Date) => {
    setSelectedDate(date);
    setTimesForSelectedDate(calendarData[formatDate(date)] || []);
    setOpenDeleteModal(true);
  };

  const handleCloseModal = () => {
    setOpenAddModal(false);
    setOpenDeleteModal(false);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedIds([]);
    setTimesForSelectedDate([]);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTime = (time: Dayjs) => {
    return time.format('HH:mm');
  };

  const handleCreateCutoffDate = () => {
    if (!selectedPortId) {
      toast.error('Please select a port before creating a cut-off date.');
      return;
    }

    if (!selectedTime) {
      toast.error('Please select a time before creating a cut-off date.');
      return;
    }

    const payload = {
      cut_off_date: `${formatDate(selectedDate)} ${formatTime(selectedTime)}`,
    };
    api.post(TransportUrls.createFreightForwarderCutoffDatesUrl(freightForwarderId, selectedPortId), payload)
      .then(() => {
        toast.success('Cut off date created successfully');
        fetchCalendarData(freightForwarderId, selectedPortId);
        handleCloseModal();
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };

  const handleDeleteCutoffDate = async () => {
    if (selectedIds.length === 0) {
      toast.error('No cut-off dates selected for deletion.');
      return;
    }
  
    try {
      for (const id of selectedIds) {
        await api.delete(TransportUrls.deleteFreightForwarderCutoffDateUrl(id));
      }
      toast.success('Cut off dates deleted successfully');
      fetchCalendarData(freightForwarderId, selectedPortId);
      handleCloseModal();
    } catch (error: any) {
      const status = error?.response?.status;
      toast.error(getDefaultError(status));
    }
  };

  const handleCheckboxChange = (id: number) => {
    setSelectedIds(prevSelectedIds => {
      if (prevSelectedIds.includes(id)) {
        return prevSelectedIds.filter(selectedId => selectedId !== id);
      } else {
        return [...prevSelectedIds, id];
      }
    });
  };

  return (
    <>
      <Box sx={{ width: '350px' }}>
        <RitzSearchableSelection
          options={ports}
          name="port"
          id="port"
          labelText="Select Port"
          selectedValue={selectedPortId}
          handleOnChange={handlePortChange}
          optionValue="id"
          optionText="name"
        />
      </Box>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ mt: 5 }}>
          {isLoading ? (
            <DefaultLoader />
          ) : (
            <Calendar
              data={calendarData}
              showAddIcon={true}
              showDeleteIcon={true}
              showTooltip={true}
              tooltipComponent={(dateKey) => (
                <Tooltip
                  title={
                    <div>
                      {calendarData[dateKey].map((item: any, index: number) => (
                        <div key={index}>
                          <Typography>{`Time: ${item.time}`}</Typography>
                        </div>
                      ))}
                    </div>
                  }
                >
                  <div>
                    <AccessTimeIcon sx={{ fontSize: '16px', cursor: 'pointer' }} />
                  </div>
                </Tooltip>
              )}
              onAddIconClick={handleAddIconClick}
              onDeleteIconClick={handleDeleteIconClick}
            />
          )}
        </Box>
      </Box>

      <RitzModal open={openAddModal} onClose={handleCloseModal} title="Confirm Create">
        <Typography>Enter Cut-off time</Typography>
        <Box sx={{ mt: 2 }}> 
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimePicker
              label="Time"
              value={selectedTime}
              onChange={(newValue) => setSelectedTime(newValue)}
            />
          </LocalizationProvider>
        </Box>
        <Box display="flex" justifyContent="flex-start" mt={2}>
          <Button variant="outlined" onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleCreateCutoffDate} sx={{ ml: 12 }}>Create</Button>
        </Box>
      </RitzModal>

      <RitzModal open={openDeleteModal} onClose={handleCloseModal} title="Confirm Delete">
        <Typography>Select Cut-off times to delete</Typography>
        <Box sx={{ width:'250px' , mt: 2 }}>
          <FormGroup>
            {timesForSelectedDate.map((item: any) => (
              <FormControlLabel
                key={item.id}
                control={
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleCheckboxChange(item.id)}
                  />
                }
                label={item.time}
              />
            ))}
          </FormGroup>
        </Box>
        <Box display="flex" justifyContent="flex-start" mt={2}>
          <Button variant="outlined" onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteCutoffDate} sx={{ ml: 12 }}>Delete</Button>
        </Box>
      </RitzModal>
    </>
  );
};

export default FreightForwarderCutofDates;