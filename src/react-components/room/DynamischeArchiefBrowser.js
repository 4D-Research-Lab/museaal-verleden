import React, { useState, useEffect } from 'react';
import PropTypes from "prop-types";
import { TextInputField } from "../input/TextInputField";
import { IconButton } from "../input/IconButton";
import { ReactComponent as CloseIcon } from "../icons/Close.svg";
import { Button } from "../input/Button";
import { Column } from "../layout/Column";
import { MediaGrid } from "./MediaGrid";
import classNames from "classnames";
import styles from "./DynamischeArchiefBrowser.scss";
import { ReactComponent as ArrowForwardIcon } from "../icons/ArrowForward.svg";
import { ReactComponent as ArrowBackIcon } from "../icons/ArrowBack.svg";

function DynamischeArchiefBrowser({ scene, onClose }) {

    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [authToken, setAuthToken] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [allRecords, setAllRecords] = useState([]);

    const recordsPerPage = 12;
    const indexOfLastRecord = (currentPage + 1) * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = allRecords.slice(indexOfFirstRecord, indexOfLastRecord);

    const loginEndpoint = "https://dynamischarchief.nl/engine/api/dnarestapi/login";

    useEffect(() => {
        // Call the login function when the component mounts
        login();
    }, []); // Empty dependency array to ensure this effect runs only once


    const login = () => {
        fetch(loginEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                loginname: "souhayl_ouchene@live.nl",
                password: "MuseaalVerleden4D"
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data && data.authhash) {
                    setAuthToken(data.authhash); // Store the auth token
                } else {
                    console.error('Authentication failed', data);
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    };

    const fetchRecords = (query) => {

        if (!authToken) return;

        // Calculate the offset based on the current page
        const offset = currentPage * recordsPerPage;

        const queryDef = {
            "class": "object",
            "resultFields": [],
            "filter": {
                "operator": "like",
                "field": "Title",
                "value": `%${query}%`,
            }
        };

        const encodedQueryDef = encodeURIComponent(JSON.stringify(queryDef));

        const url = `https://dynamischarchief.nl/engine/api/dnarestapi/query?querydef=${encodedQueryDef}&authhash=${authToken}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.recordList) {
                    console.log(data);
                    setAllRecords(data.recordList);
                }
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
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

    // Function to go to the next page
    const handleNextPage = () => {
        setCurrentPage(currentPage + 1);
    };

    // Function to go to the previous page
    const handlePreviousPage = () => {
        setCurrentPage(currentPage - 1);
    };

    const handleImageClick = (record) => {

        const url = `https://dynamischarchief.nl/engine/api/dnarestapi/download/object/${record.key}/Image?authhash=${authToken}`;

        console.log(record);

        let title = record.data.Title;
        let user = record.data.User;
        let yearMade = record.data.Year_made;
        let description = stripHtmlTags(record.data.Description);
        let provenance = "";
        let curatorsComment = "";
        let link = createLink(record.key, title);

        if (record.data.Curators_comment) {
            curatorsComment = stripHtmlTags(record.data.Curators_comment);
        }

        if (record.data.Provenance) {
            provenance = record.data.Provenance;
        }

        const metadata = { api: "da", title: title, user: user, yearMade: yearMade, description: description, provenance: provenance, curatorsComment: curatorsComment, link: link};

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

    function stripHtmlTags(str) {
        if (typeof str === 'string') {
            return str.replace(/<\/?[^>]+(>|$)/g, "");
        }
        return '';
    }

    function createLink(key, title) {
        const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '-');
        return `https://dynamischarchief.nl/object/${key}/${sanitizedTitle.toLowerCase()}`;
      }

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
                                fetchRecords(query);
                            }
                        }} disabled={loading}>{loading ? 'Searching...' : 'Search'} </Button>
                </div>
            </div>
            <div className={styles.content}>
                <Column>
                    <MediaGrid>
                        {currentRecords.map(record => (
                            <div key={record.key} onClick={() => handleImageClick(record)}>
                                <h3>{record.data.Title}</h3>
                                <img src={`https://dynamischarchief.nl/engine/api/dnarestapi/download/object/${record.key}/Image?authhash=${authToken}`} alt={record.data.Title} />
                            </div>
                        ))}
                    </MediaGrid>
                    <div className={styles.pager}>
                        <button type="button" className={styles.pagerButton} disabled={currentPage === 0} onClick={handlePreviousPage}>
                            <ArrowBackIcon />
                        </button>
                        <button type="button" className={styles.pagerButton} disabled={(currentPage + 1) >= Math.ceil(allRecords.length / recordsPerPage)} onClick={handleNextPage}>
                            <ArrowForwardIcon />
                        </button>
                    </div>
                </Column>
            </div>
        </div>
    )
}

DynamischeArchiefBrowser.propTypes = {
    scene: PropTypes.object.isRequired,
    onClose: PropTypes.func
};

export default DynamischeArchiefBrowser;