import React, { useEffect, useState } from 'react';
import { Box, Button, IconButton, Checkbox, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RitzTable from '@/components/Ritz/RitzTable';
import RitzModal from '@/components/Ritz/RitzModal';
import api from '@/services/api';
import toast from 'react-hot-toast';
import * as TransportUrls from '../../../helpers/constants/rest_urls/TransportUrls';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import { ADMIN } from '@/helpers/constants/RoleManager';
import SaveSpinner from '@/components/SaveSpinner';

const FreightForwarderPorts = ({ freightForwarderId }: any) => {
  const [ports, setPorts] = useState<any[]>([]);
  const [allPorts, setAllPorts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedPorts, setSelectedPorts] = useState<any[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePortId, setDeletePortId] = useState<number | null>(null);
  const canDelete = hasRole(ADMIN);

  const portscolumnonsupplier = [
    {
      accessorKey: 'name',
      header: 'Port Name',
    },
    {
      accessorKey: 'address_line_1',
      header: 'Address Line 1',
    },
    {
      accessorKey: 'address_line_2',
      header: 'Address Line 2',
    },
    {
      accessorKey: 'country_name',
      header: 'Country Name',
    },
    {
      accessorKey: 'port_type',
      header: 'Port Type',
    },
    ...(canDelete ? [{
      accessorKey: 'id',
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props:any) => (
        <Box display="flex" justifyContent="center">
          <IconButton size="small" color="error" onClick={() => openDeleteModal(props.getValue() as number)}>
            <DeleteIcon fontSize="inherit" />
          </IconButton>
        </Box>
      ),
      meta: {
        align: 'center',
        width: 100,
      },
    }] : []),
  ];

  const portColumns = [
    {
      accessorKey: 'id',
      header: () => (
        <Checkbox
          checked={isAllSelected}
          onChange={handleSelectAllChange}
        />
      ),
      cell: (props:any) => (
        <Checkbox
          checked={selectedPorts.includes(props.getValue())}
          onChange={() => handlePortCheckboxChange(props.getValue())}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      meta: {
        align: 'center',
        width: 100,
      },
    },
    {
      accessorKey: 'name',
      header: 'Port Name',
    },
    {
      accessorKey : 'city',
      header: 'City',
    },
    {
      accessorKey: 'country_name',
      header: 'Country',
    },
    {
      accessorKey:'port_type',
      header: 'Port Type',
    }
  ];

  const getFreightForwarderPorts = () => {
    if (freightForwarderId) {
      api
        .get(TransportUrls.createFreightForwarderPortURL(freightForwarderId))
        .then((resp) => {
          const respData = resp?.data || [];
          const portDetails = respData.map((item: any) => item.port_details);
          setPorts(portDetails);
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };

  const getPortList = () => {
    api.get(TransportUrls.countryPortListUrl()).then(resp => {
      const respData = resp?.data || [];
      const portList = respData.flatMap((country: { ports: any; }) => country.ports);
      setAllPorts(portList);
      setSelectedPorts([]);
      setIsAllSelected(false);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    });
  };

  const handleDeletePort = (portId: number) => {
    if (freightForwarderId) {
      api
        .delete(TransportUrls.deletePortUrl(freightForwarderId, portId))
        .then(() => {
          toast.success('Port deleted successfully.');
          getFreightForwarderPorts();
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        });
    }
  };

  const handleSelectAllChange = () => {
    if (isAllSelected) {
      setSelectedPorts([]);
    } else {
      setSelectedPorts(allPorts.map((port) => port.id));
    }
    setIsAllSelected(!isAllSelected);
  };

  const handlePortCheckboxChange = (portId: any) => {
    setSelectedPorts((prevSelectedPorts) =>
      prevSelectedPorts.includes(portId)
        ? prevSelectedPorts.filter((id) => id !== portId)
        : [...prevSelectedPorts, portId]
    );
  };

  const handleSavePorts = () => {
    if (!freightForwarderId) {
      toast.error("Freight Forwarder is not available.");
      return;
    }
    setIsSaving(true);

    const uniqueSelectedPorts = selectedPorts.filter(portId => 
      !ports.some(existingPort => existingPort.id === portId)
    );

    if (uniqueSelectedPorts.length === 0) {
      toast.error("Already Added.");
      setIsSaving(false);
      return;
    }

    const request = {
      method: 'post',
      url: TransportUrls.createFreightForwarderPortURL(freightForwarderId),
      data: { ports: uniqueSelectedPorts }
    };
    api(request)
      .then(() => {
        toast.success("Ports saved successfully.");
        getFreightForwarderPorts();
        setOpen(false);
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => setIsSaving(false));
  };

  const modalOpen = () => {
    getPortList();
    setOpen(true);
  };

  const modalClose = () => {
    setOpen(false);
  };

  const openDeleteModal = (portId: number) => {
    setDeletePortId(portId);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletePortId(null);
  };

  const confirmDeletePort = () => {
    if (deletePortId !== null) {
      handleDeletePort(deletePortId);
      closeDeleteModal();
    }
  };

  useEffect(() => {
    getFreightForwarderPorts();
  }, [freightForwarderId]);

  return (
    <>
      <Button variant="outlined" sx={{ my: 3 }} onClick={modalOpen}>
        Add Port
      </Button>
      <RitzTable title="Ports" data={ports} columns={portscolumnonsupplier} border={false} />
      <RitzModal open={open} onClose={modalClose} title="Add Ports">
        <>
          <RitzTable
            data={allPorts} 
            columns={portColumns}
            border={false}
          />
        <Box display="flex" justifyContent="flex-end" sx={{ my: 3 }}>
        <Button variant="outlined" onClick={handleSavePorts} disabled={isSaving}>
            {isSaving && <SaveSpinner />}Save
        </Button>
        </Box>
        </>
      </RitzModal>
      <RitzModal open={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirm Delete">
        <Typography>Are you sure you want to delete this port?</Typography>
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button variant="outlined" onClick={closeDeleteModal}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDeletePort} sx={{ ml: 2 }}>Delete</Button>
        </Box>
      </RitzModal>
    </>
  );
};

export default FreightForwarderPorts;