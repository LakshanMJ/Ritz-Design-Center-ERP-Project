import { Box, Button, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useEffect, useState } from "react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import * as TransportUrls from "@/helpers/constants/rest_urls/TransportUrls";

const CopyCharges = ({ SelectedChargeId, TransportTrackingId, SelectedChargesData, onPrevious }: any) => {
  const [transportTypes, setTransportTypes] = useState<any[]>([]);
  const [selectedToggle, setSelectedToggle] = useState<any>(null);

  const fetchTransportTypes = () => {
    api.get(TransportUrls.getDeliveryTransportTypeListURL(TransportTrackingId))
      .then((response) => {
        const filteredTransportTypes = response.data.filter((type: any) => type.id !== SelectedChargeId);
        setTransportTypes(filteredTransportTypes);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };

  const handleToggleChange = (event: any, newToggle: string) => {
    if (newToggle !== null) {
      setSelectedToggle(newToggle);
    }
  };

  const handleCopyCharges = () => {

    const copydata = {
      copy_to_delivery_transport_type_id: selectedToggle,
      transport_type_charge_ids: SelectedChargesData
    };

    api.post(TransportUrls.copyChargersURL(TransportTrackingId), copydata)
      .then((response) => {
        toast.success("Charges copied successfully!");
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };

  useEffect(() => {
    fetchTransportTypes();
  }, []);

  return (
    <Box>
      <ToggleButtonGroup value={selectedToggle} exclusive onChange={handleToggleChange} aria-label="Transport Type">
        {transportTypes.map((type: any) => (
          <ToggleButton
            key={type.id}
            value={type.id}
            aria-label={type.name}
            style={{
              height: "4em",
              minWidth: "150px",
              border: "1px solid #E0E0E0",
              borderRadius: "5px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              marginBottom: "10px",
              marginRight: "10px",
            }}
          >
            {type.name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button variant="outlined" color="secondary" onClick={onPrevious} sx={{ mt: 2 }}>
          Previous
        </Button>
        <Button variant="contained" color="primary" onClick={handleCopyCharges} disabled={selectedToggle === null} sx={{ mt: 2 }}>
          Copy Charges
        </Button>
      </Box>
    </Box>
  );
};

export default CopyCharges;