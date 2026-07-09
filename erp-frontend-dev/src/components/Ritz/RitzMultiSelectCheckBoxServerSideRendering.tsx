import {
  Checkbox,
  TextField,
  Autocomplete,
  Typography,
  MenuItem,
  IconButton,
  Chip
} from "@mui/material";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import debounce from "lodash/debounce";
import api from "@/services/api";

const RitzMultiSelectCheckBoxServerSideRendering = ({
  id,
  optionValue = "id",
  optionDisplayValue = "title",
  labelText,
  handleOnChange,
  handleOnClose,
  selectedValues = [],
  name,
  disableClearable = false,
  disableValues = [],
  showDelete = false,
  handleDeleteSubComponent,
  isReadOnly = false,
  size = "medium",
  optionUrl,
  searchOptionsList
}: any) => {
  const [selectOptions, setSelectOptions] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetchedInitialData, setHasFetchedInitialData] = useState(false); 

  const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
  const checkedIcon = <CheckBoxIcon fontSize="small" />;

  const fetchOptions = useCallback((searchValue: string) => {
    setIsLoading(true);
    api
      .get(optionUrl(searchValue))
      .then((response) => {
        const data = response.data || [];
        setSelectOptions(data);
        if (searchOptionsList) {
          searchOptionsList(data);
        }
      })
      .catch((error) => {
        console.error("Error fetching search options", error);
        setSelectOptions([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [optionUrl, searchOptionsList]);

  const debouncedFetchOptions = useCallback(
    debounce((searchValue: string) => {
      fetchOptions(searchValue);
    }, 300),
    [fetchOptions]
  );

  const handleInputChange = (event: any, value: string, reason: string) => {
    if (reason !== "reset") {
      setSearchText(value);
      debouncedFetchOptions(value);
    }
  };

  const handleFocus = () => {
    if (!hasFetchedInitialData) {
      fetchOptions(""); 
      setHasFetchedInitialData(true);
    }
  };

    // Add this useEffect to fetch options when selectedValues exist
    useEffect(() => {
      if (selectedValues.length > 0 && !hasFetchedInitialData) {
        fetchOptions("");
        setHasFetchedInitialData(true);
      }
    }, [selectedValues, hasFetchedInitialData, fetchOptions]);

  return (
    <>
      {labelText && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {labelText}
        </Typography>
      )}
      <Autocomplete
        multiple
        id={id}
        options={selectOptions}
        disableCloseOnSelect
        disableClearable={disableClearable}
        getOptionLabel={(option) => option?.[optionDisplayValue]}
        loading={isLoading}
        inputValue={searchText}
        onInputChange={handleInputChange}
        renderOption={(props, option) => (
          <MenuItem
            {...props}
            key={`${id}_${option?.[optionValue]}`}
            disabled={disableValues && disableValues.includes(option?.[optionValue])}
          >
            <Checkbox
              key={`ch-${id}_${option?.[optionValue]}`}
              icon={icon}
              checkedIcon={checkedIcon}
              style={{ marginRight: 8 }}
              checked={selectedValues.indexOf(option?.[optionValue]) >= 0}
            />
            {option?.[optionDisplayValue]}
          </MenuItem>
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => {
            const { key, ...rest } = getTagProps({ index });
            return (
              <Chip
                key={key}
                label={option?.[optionDisplayValue]}
                {...rest}
              />
            );
          })
        }
        value={
          selectOptions.filter(
            (selectOption: any) =>
              selectedValues.indexOf(selectOption[optionValue]) >= 0
          ) || []
        }
        renderInput={(params) => (
          <TextField
            sx={{ backgroundColor: "#fff", borderRadius: "10px" }}
            {...params}
            name={name}
            placeholder="Search..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {showDelete && (
                    <IconButton
                      color="error"
                      onClick={handleDeleteSubComponent}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
            onFocus={handleFocus}
          />
        )}
        onChange={(event, option, reason, details) => {
          handleOnChange(event, option, reason, details);
          setSearchText(""); 
        }}
        onClose={(event) => {
          if (handleOnClose) {
            handleOnClose(event);
          }
          setSearchText(""); 
        }}
        disabled={isReadOnly}
        size={size}
      />
    </>
  );
};

export default RitzMultiSelectCheckBoxServerSideRendering;