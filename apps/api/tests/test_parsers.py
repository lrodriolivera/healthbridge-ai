"""Tests for file parsers (JAR, Mirth, Rhapsody, BizTalk)"""

import io
import zipfile

import pytest
from src.services.file_parser.jar_parser import JARParser
from src.services.file_parser.mirth_parser import MirthParser
from src.services.file_parser.rhapsody_parser import RhapsodyParser
from src.services.file_parser.biztalk_parser import BizTalkParser


class TestJARParser:
    def _make_jar(self, files: dict[str, str]) -> bytes:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            for name, content in files.items():
                zf.writestr(name, content)
        return buf.getvalue()

    def test_parse_basic_jar(self):
        jar_bytes = self._make_jar({
            "composite.xml": "<composite/>",
            "process.bpel": "<bpel/>",
            "transform.xsl": "<xsl/>",
            "schema.wsdl": "<wsdl/>",
            "types.xsd": "<xsd/>",
        })
        parser = JARParser()
        result = parser.parse(jar_bytes)
        assert result["composite_xml"] == "<composite/>"
        assert "process.bpel" in result["bpel_files"]
        assert "transform.xsl" in result["xsl_files"]
        assert "schema.wsdl" in result["wsdl_files"]
        assert "types.xsd" in result["xsd_files"]

    def test_parse_empty_jar(self):
        jar_bytes = self._make_jar({})
        parser = JARParser()
        result = parser.parse(jar_bytes)
        assert result["composite_xml"] is None
        assert len(result["bpel_files"]) == 0

    def test_parse_invalid_jar(self):
        parser = JARParser()
        with pytest.raises(ValueError):
            parser.parse(b"not a zip file")


class TestMirthParser:
    SAMPLE_CHANNEL = """<?xml version="1.0"?>
    <channel>
        <name>ADT_Inbound</name>
        <description>Receives ADT messages</description>
        <enabled>true</enabled>
        <sourceConnector>
            <name>TCP Listener</name>
            <transportName>TCP Listener</transportName>
            <mode>SOURCE</mode>
            <enabled>true</enabled>
            <properties/>
            <transformer><steps/></transformer>
            <filter><rules/></filter>
        </sourceConnector>
        <destinationConnectors>
            <connector>
                <name>IRIS Forward</name>
                <transportName>TCP Sender</transportName>
                <mode>DESTINATION</mode>
                <enabled>true</enabled>
                <properties/>
                <transformer><steps/></transformer>
                <filter><rules/></filter>
            </connector>
        </destinationConnectors>
        <properties/>
    </channel>"""

    def test_parse_channel(self):
        parser = MirthParser()
        result = parser.parse(self.SAMPLE_CHANNEL)
        assert result["channel_name"] == "ADT_Inbound"
        assert result["description"] == "Receives ADT messages"
        assert result["enabled"] is True
        assert result["source_connector"]["name"] == "TCP Listener"
        assert len(result["destination_connectors"]) == 1
        assert result["destination_connectors"][0]["name"] == "IRIS Forward"

    def test_parse_invalid_xml(self):
        parser = MirthParser()
        with pytest.raises(ValueError):
            parser.parse("not xml at all")


class TestRhapsodyParser:
    SAMPLE_ROUTE = """<route name="HL7_Route">
        <inputCommunicationPoint name="TCP_In" />
        <filter name="ADT_Filter" />
        <outputCommunicationPoint name="TCP_Out" />
    </route>"""

    def test_parse_route(self):
        parser = RhapsodyParser()
        result = parser.parse(self.SAMPLE_ROUTE)
        assert result["route_name"] == "HL7_Route"
        assert result["total_components"] >= 3
        assert len(result["input_points"]) == 1
        assert len(result["output_points"]) == 1
        assert len(result["filters"]) == 1


class TestBizTalkParser:
    SAMPLE_BINDING = """<BindingInfo>
        <ReceiveLocation Name="HTTP_Receive">
            <Address>http://localhost:8080/receive</Address>
            <TransportType>HTTP</TransportType>
            <ReceivePipeline>XMLReceive</ReceivePipeline>
        </ReceiveLocation>
        <SendPort Name="SOAP_Send" IsTwoWay="true">
            <Address>http://target:8081/service</Address>
            <TransportType>SOAP</TransportType>
            <SendPipeline>XMLTransmit</SendPipeline>
        </SendPort>
    </BindingInfo>"""

    def test_parse_binding(self):
        parser = BizTalkParser()
        result = parser.parse(self.SAMPLE_BINDING)
        assert result["total_receive"] == 1
        assert result["total_send"] == 1
        assert result["receive_locations"][0]["name"] == "HTTP_Receive"
        assert result["send_ports"][0]["name"] == "SOAP_Send"
        assert result["send_ports"][0]["is_two_way"] is True
