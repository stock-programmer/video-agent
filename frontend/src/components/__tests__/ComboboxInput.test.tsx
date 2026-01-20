import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComboboxInput, type ComboboxOption } from '../ComboboxInput';

describe('ComboboxInput', () => {
  const mockOptions: ComboboxOption[] = [
    { value: 'option1', label: '选项1', description: '第一个选项' },
    { value: 'option2', label: '选项2', description: '第二个选项' },
    { value: 'option3', label: '选项3' }
  ];

  it('renders input field with label', () => {
    const onChange = vi.fn();
    render(
      <ComboboxInput
        id="test-input"
        label="测试标签"
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    expect(screen.getByLabelText('测试标签')).toBeInTheDocument();
  });

  it('allows free text input', () => {
    const onChange = vi.fn();
    render(
      <ComboboxInput
        id="test-input"
        label="测试标签"
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    const input = screen.getByLabelText('测试标签') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '自定义输入' } });

    expect(onChange).toHaveBeenCalledWith('自定义输入');
  });

  it('shows dropdown when button is clicked', () => {
    const onChange = vi.fn();
    render(
      <ComboboxInput
        id="test-input"
        label="测试标签"
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    const dropdownButton = screen.getByLabelText('显示预设选项');
    fireEvent.click(dropdownButton);

    expect(screen.getByText('选项1')).toBeInTheDocument();
    expect(screen.getByText('选项2')).toBeInTheDocument();
    expect(screen.getByText('选项3')).toBeInTheDocument();
  });

  it('selects option from dropdown', () => {
    const onChange = vi.fn();
    render(
      <ComboboxInput
        id="test-input"
        label="测试标签"
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    // Open dropdown
    const dropdownButton = screen.getByLabelText('显示预设选项');
    fireEvent.click(dropdownButton);

    // Click on option
    const option1 = screen.getByText('选项1');
    fireEvent.click(option1);

    expect(onChange).toHaveBeenCalledWith('option1');
  });

  it('displays option description when available', () => {
    const onChange = vi.fn();
    render(
      <ComboboxInput
        id="test-input"
        label="测试标签"
        value=""
        onChange={onChange}
        options={mockOptions}
      />
    );

    const dropdownButton = screen.getByLabelText('显示预设选项');
    fireEvent.click(dropdownButton);

    expect(screen.getByText('第一个选项')).toBeInTheDocument();
  });
});
