USE groupcal_db;
CREATE TABLE `APPTCACHE` (
`ID` varchar(100) COLLATE utf8mb4_bin NOT NULL,
`RECURRENCEID` varchar(255) COLLATE utf8mb4_bin NOT NULL,
`ACCOUNT`varchar(100) COLLATE utf8mb4_bin NOT NULL,
`START_TIMESTAMP` bigint(20),
`END_TIMESTAMP` bigint(20),
`APPTDATA` longtext COLLATE utf8mb4_bin,
`ACTIVE` TINYINT(1),
  PRIMARY KEY (`ID`,`ACCOUNT`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
