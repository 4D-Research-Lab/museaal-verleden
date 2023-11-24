import React, { useState, useEffect } from 'react';
import PropTypes from "prop-types";
import classNames from "classnames";
import { joinChildren } from "../misc/joinChildren";
import styles from "./ObjectMenu.scss";
import { IconButton } from "../input/IconButton";
import { ReactComponent as CloseIcon } from "../icons/Close.svg";
import { ReactComponent as ChevronBackIcon } from "../icons/ChevronBack.svg";
import { ReactComponent as ArrowBackIcon } from "../icons/ArrowBack.svg";
import { ReactComponent as ArrowForwardIcon } from "../icons/ArrowForward.svg";
import { ReactComponent as LightbulbIcon } from "../icons/Lightbulb.svg";
import { ReactComponent as LightbulbOutlineIcon } from "../icons/LightbulbOutline.svg";


export function ObjectMenuButton({ children, className, ...rest }) {
  return (
    <IconButton compactSm className={classNames(styles.objectMenuButton, className)} {...rest}>
      {children}
    </IconButton>
  );
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toISOString().split('T')[0];
}

ObjectMenuButton.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};

export function ObjectMenu({
  children,
  title,
  onClose,
  onBack,
  onPrevObject,
  onNextObject,
  currentObjectIndex,
  objectCount,
  onToggleLights,
  lightsEnabled,
  isAvatar,
  metadata
}) {

  return (
    <>
      <IconButton className={styles.backButton} onClick={onBack}>
        <ChevronBackIcon width={24} height={24} />
      </IconButton>
      <IconButton className={styles.lightsButton} onClick={onToggleLights}>
        {lightsEnabled ? (
          <LightbulbOutlineIcon title="Turn Lights Off" width={24} height={24} />
        ) : (
          <LightbulbIcon title="Turn Lights On" width={24} height={24} />
        )}
      </IconButton>
      <div className={styles.objectMenuContainer}>
        <div className={styles.objectMenu}>
          <div className={styles.header}>
            <IconButton className={styles.closeButton} onClick={onClose}>
              <CloseIcon width={16} height={16} />
            </IconButton>
            <h5>{title}</h5>
            <IconButton className={styles.lightsHeaderButton} onClick={onToggleLights}>
              {lightsEnabled ? (
                <LightbulbOutlineIcon title="Turn Lights Off" width={16} height={16} />
              ) : (
                <LightbulbIcon title="Turn Lights On" width={16} height={16} />
              )}
            </IconButton>
          </div>
          <div className={styles.metadata}>
            {metadata && (
              <>
                {metadata.api == 'europeana' && (
                  <>
                    <div><b>Title:</b> {metadata.title}</div>
                    <div><b>Provider:</b> {metadata.provider}</div>
                    <div><b>Date:</b> {metadata.date}</div>
                    <div><b>Date of creation:</b> {formatDate(metadata.dateOfCreation)}</div>
                    <div><b>Date of update:</b> {formatDate(metadata.dateOfUpdate)}</div>
                    <div><a href={metadata.link} target="_blank" rel="noopener noreferrer"><b>Link</b></a></div>
                  </>
                )}
                {metadata.api == 'da' && (
                  <>
                    <div><b>Title:</b> {metadata.title}</div>
                    <div><b>User:</b> {metadata.user}</div>
                    <div><b>Year made:</b> {metadata.yearMade}</div>
                    {metadata.provenance !== "" && (
                      <div>
                        <div><b>Provenance</b></div>
                        <div>{metadata.provenance}</div>
                      </div>
                    )}
                    {metadata.description !== "" && (
                      <div>
                        <div><b>Description</b></div>
                        <div className={styles.metadataContent}dangerouslySetInnerHTML={{ __html: metadata.description }} />
                      </div>
                    )}
                    {metadata.curatorsComment !== "" && (
                      <div>
                        <div><b>Curators comment</b></div>
                        <div className={styles.metadataContent} dangerouslySetInnerHTML={{ __html: metadata.curatorsComment }}/>
                      </div>
                    )}
                        <div><a href={metadata.link} target="_blank" rel="noopener noreferrer"><b>Link</b></a></div>
                  </>
                )}
              </>
            )}
          </div>
          <div className={styles.menu}>
            {joinChildren(children, () => (
              <div className={styles.separator} />
            ))}
          </div>
        </div>
        {!isAvatar && (
          <div className={styles.pagination}>
            <IconButton onClick={onPrevObject}>
              <ArrowBackIcon width={24} height={24} />
            </IconButton>
            <p>
              {currentObjectIndex + 1}/{objectCount}
            </p>
            <IconButton onClick={onNextObject}>
              <ArrowForwardIcon width={24} height={24} />
            </IconButton>
          </div>
        )}

      </div>
    </>
  );
}

ObjectMenu.propTypes = {
  currentObjectIndex: PropTypes.number.isRequired,
  objectCount: PropTypes.number.isRequired,
  onPrevObject: PropTypes.func,
  onNextObject: PropTypes.func,
  children: PropTypes.node,
  title: PropTypes.node,
  onClose: PropTypes.func,
  onBack: PropTypes.func,
  onToggleLights: PropTypes.func,
  lightsEnabled: PropTypes.bool,
  isAvatar: PropTypes.bool,
  metadata: PropTypes.object
};
