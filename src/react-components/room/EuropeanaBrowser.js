import React, { useState, useEffect } from 'react';
import PropTypes from "prop-types";

import { ReactComponent as SearchIcon } from "../icons/Search.svg";
import { ReactComponent as StarIcon } from "../icons/Star.svg";
import { ReactComponent as CloseIcon } from "../icons/Close.svg";
import { ReactComponent as ArrowForwardIcon } from "../icons/ArrowForward.svg";
import { ReactComponent as ArrowBackIcon } from "../icons/ArrowBack.svg";
import { FormattedMessage, defineMessages, useIntl } from "react-intl";
import { TextInputField } from "../input/TextInputField";
import { IconButton } from "../input/IconButton";
import { FullscreenLayout } from "../layout/FullscreenLayout";
import { Button } from "../input/Button";
import { Column } from "../layout/Column";
import { MediaGrid } from "./MediaGrid";
import styles from "./EuropeanaBrowser.scss";
import { MediaTile } from './MediaTiles';
import classNames from "classnames";

function EuropeanaBrowser({ scene, onClose }) {
  const [query, setQuery] = useState('');
  const [imageRecords, setImageRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [metadata, setMetadata] = useState(null);

  const [currentPage, setCurrentPage] = useState(0);
  const recordsPerPage = 14; // or another appropriate number
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    const start = currentPage * recordsPerPage + 1;
    fetchImages(query, start); // Call this function when the component mounts
  }, [query, currentPage]); // Add currentPage as a dependency

  const fetchImages = (query, start) => {
    // Modify the Europeana API endpoint to include the user's query
    const apiEndpoint = `https://api.europeana.eu/api/v2/search.json?wskey=chirmurgand&query=${query}&media=true&reusability=open&qf=TYPE%3AIMAGE&start=${start}&rows=${recordsPerPage}&profile=rich`;

    fetch(apiEndpoint)
      .then((response) => response.json())
      .then((data) => {
        setImageRecords(data.items || []); // Set to empty array if data.items is undefined
        setTotalResults(data.totalResults || 0); // Same safeguard for totalResults
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching images:', error);
        setLoading(false);
      });
  };

  const handleImageClick = (image) => {
    console.log(image);

    const url = image.edmPreview;
    let date = "";
    let description = "";

    if (image.dcDescription && image.dcDescription.length > 0) {
      description = image.dcDescription[0];
    }

    if (image.edmTimespan && image.edmTimespan.length > 0) {
      date = image.edmTimespan[0];
    }

    const metadata = { api: "europeana", title: image.title[0], provider: image.provider[0], description: description, date: date, dateOfCreation: image.timestamp_created, dateOfUpdate: image.timestamp_update, link: image.guid };

    setMetadata(metadata);

    const fileArr = [];

    toDataURL(url)
      .then(dataUrl => {
        var fileData = dataURLtoFile(dataUrl, "imageName.jpg");
        fileArr.push(fileData)

        scene.emit("add_media", { file: fileData, metadata: metadata });

        onClose();
      })
  };

  const toDataURL = (url) => fetch(url)
    .then(response => response.blob())
    .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    }))

  function dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  const handleNextPage = () => {
    const newStart = (currentPage + 1) * recordsPerPage + 1;
    setCurrentPage(currentPage + 1);
    fetchImages(query, newStart);
  };

  const handlePreviousPage = () => {
    const newStart = (currentPage - 1) * recordsPerPage + 1;
    setCurrentPage(currentPage - 1);
    fetchImages(query, newStart);
  };

  return (
    <div className={styles.fullscreenLayout}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className={styles.headerCenter}>
          <TextInputField
            value={query}
            onChange={(e) => setQuery(e.target.value)} />
          <Button sm
            onClick={() => {
              if (query) {
                setLoading(true);
                fetchImages(query);
              }
            }} disabled={loading}>{loading ? 'Searching...' : 'Search'} </Button>
        </div>
      </div>
      <div className={styles.content}>
        <Column>
          <MediaGrid>
            {imageRecords.map((record, index) => (
              <div key={index} onClick={() => handleImageClick(record)}>
                <h3>{record.title[0]}</h3>
                <img className={styles.imageStyle} src={record.edmPreview} alt={record.title[0]} />
              </div>
            ))}
          </MediaGrid>
          <div className={styles.pager}>
            <button type="button" className={styles.pagerButton} disabled={currentPage === 0} onClick={handlePreviousPage}>
              <ArrowBackIcon />
            </button>
            <button type="button" className={styles.pagerButton} disabled={(currentPage + 1) >= Math.ceil(totalResults / recordsPerPage)} onClick={handleNextPage}>
              <ArrowForwardIcon />
            </button>
          </div>
        </Column>
      </div>
    </div>
  );
}

EuropeanaBrowser.propTypes = {
  scene: PropTypes.object.isRequired,
  onClose: PropTypes.func
};

export default EuropeanaBrowser;

