// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AgentVault {
    address public owner;
    
    struct Task {
        string description;
        address recipient;
        uint256 amount;
        bool executed;
        uint256 timestamp;
    }
    
    Task[] public tasks;
    
    event TaskCreated(uint256 indexed taskId, string description, address recipient, uint256 amount);
    event TaskExecuted(uint256 indexed taskId, address recipient, uint256 amount);
    event FundsDeposited(address indexed sender, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
    
    function deposit() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
    
    function createTask(
        string memory _description,
        address _recipient,
        uint256 _amount
    ) external onlyOwner returns (uint256) {
        tasks.push(Task({
            description: _description,
            recipient: _recipient,
            amount: _amount,
            executed: false,
            timestamp: block.timestamp
        }));
        uint256 taskId = tasks.length - 1;
        emit TaskCreated(taskId, _description, _recipient, _amount);
        return taskId;
    }
    
    function executeTask(uint256 _taskId) external onlyOwner {
        Task storage task = tasks[_taskId];
        require(!task.executed, "Already executed");
        require(address(this).balance >= task.amount, "Insufficient balance");
        task.executed = true;
        payable(task.recipient).transfer(task.amount);
        emit TaskExecuted(_taskId, task.recipient, task.amount);
    }
    
    function getTask(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }
    
    function getTaskCount() external view returns (uint256) {
        return tasks.length;
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}