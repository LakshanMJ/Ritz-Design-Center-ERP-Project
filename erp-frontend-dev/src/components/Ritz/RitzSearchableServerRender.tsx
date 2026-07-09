import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { Box, CircularProgress, InputLabel } from '@mui/material';
import api from '@/services/api';
import debounce from 'lodash/debounce';

const RitzSearchableServerRender = ({
  isMulti = false,
  isRequired = false,
  name,
  id,
  labelText,
  selectedValue = '',
  labelId = "label_1",
  handleOnChange,
  optionValue,
  optionText,
  isReadOnly = false,
  optionUrl,
  searchOptionsList,
  initialOptions = []
}: any) => {
  const [searchOptions, setSearchOptions] = useState<any>(initialOptions);
  const [isLoading, setIsLoading] = useState(false);

  const selectedOption = searchOptions?.find((option: any) => option.value === selectedValue) || null;

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      minHeight: '50px',
      height: '50px',
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
  };

  const fetchOption = (searchTextValue: string = '') => {
    setIsLoading(true);
    api.get(optionUrl(searchTextValue))
      .then(response => {
        const data = response.data || [];
        const mappedOptions = data?.results?.map((option: any) => ({
          value: option[optionValue],
          label: option[optionText]
        }));
        setSearchOptions(mappedOptions);
        if (searchOptionsList) {
          searchOptionsList(data?.results);
        }
      })
      .catch(error => {
        console.error("Error fetching search options", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Debounced Part Added - DD
  const debouncedFetch = useRef(debounce((value: string) => {
    fetchOption(value);
  }, 300)).current;

  const handleInputChange = (inputValue: string) => {
    if (inputValue?.length > 0) {
      debouncedFetch(inputValue);
    }
  };

  const handleMenuOpen = () => {
    if (searchOptions.length === 0 && initialOptions.length === 0) {
      fetchOption(); // only fetch if no initial options - DD
    }
  };

  useEffect(() => {
    const optionExists = searchOptions.find((opt: any) => opt.value === selectedValue) || initialOptions.find((opt: any) => opt.value === selectedValue);
    if (selectedValue && !optionExists) {
      fetchOption(); // load option for selected value if it's missing - DD
    }
  }, [selectedValue]);

  return (
    <>
      {labelText && <InputLabel sx={{ mb: 1 }}>{labelText}</InputLabel>}
      <Box>
        <Select
          id={id}
          name={name}
          value={selectedOption}
          options={searchOptions}
          onChange={(selectedOption: any) => handleOnChange(selectedOption?.value)}
          onInputChange={handleInputChange}
          onMenuOpen={handleMenuOpen}
          required={isRequired}
          isMulti={isMulti}
          isDisabled={isReadOnly}
          placeholder="Search..."
          styles={customStyles}
          isClearable
          menuPortalTarget={document.body}
          isLoading={isLoading}
          loadingMessage={() => (
            <Box display="flex" alignItems="center" justifyContent="center" p={1}>
              <CircularProgress size={20} />
              <Box ml={1}>Loading...</Box>
            </Box>
          )}
        />
      </Box>
    </>
  );
};

export default RitzSearchableServerRender;